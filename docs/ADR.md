# Decisiones de arquitectura — FinCard Módulo de Liquidación

Este documento junta las decisiones que tomé cuando el enunciado dejaba más
de un camino razonable, y por qué elegí el que elegí. El "qué es Arquitectura
Hexagonal y por qué la usé" ya está en el README acá voy directo a los
casos puntuales, algunos de los cuales me hicieron cambiar de opinión a mitad
de camino, y prefiero contar eso también.

## 1. Los puertos de salida devuelven `Result`, no lanzan excepciones

Cuando un repositorio o un adapter de storage puede fallar (el disco se
llenó, un archivo no existe, lo que sea), tenía dos caminos: que la función
lance una excepción, o que devuelva un valor que explícitamente diga
"esto salió bien" o "esto salió mal". Elegí lo segundo, un tipo `Result<T, E>`
propio (`shared/types/Result.ts`) porque quería que quien llama a
`transactionRepository.saveBatch(...)` esté obligado a pensar qué hace si
falla, en vez de que un `catch` genérico en otro lado se coma el error sin
que nadie lo haya decidido a propósito.

Las excepciones de dominio (`InvalidMemberIdException`,
`InvalidCsvFormatException`, etc.) las reservé para lo que sí es
verdaderamente excepcional: alguien intentó construir un `MemberId` con un
valor que no cumple el formato. Eso no es "un resultado posible del negocio",
es un invariante roto, y ahí sí tiene sentido cortar la ejecución.

## 2. El CSV se procesa de forma parcial, no todo o nada

Esta es la decisión que más vueltas le di. El enunciado, leído literal, dice
que si hay errores de validación hay que devolver un `400`. Pero también
pide un manifest con "total de filas rechazadas", lo cual solo tiene sentido
si algunas filas SÍ se procesaron y otras no, es decir, si el archivo se
puede aceptar parcialmente.

Terminé implementando el modelo parcial: las filas con error de formato
(`member_id` mal escrito, fecha inválida, lo que sea) se descartan y se
listan en la respuesta con su número de fila y columna; las filas que sí
pasan la validación se procesan normalmente. El `400` queda reservado para
cuando el archivo completo es inválido o no vino ningún archivo, la
extensión no es `.csv`, está vacío, o le faltan columnas obligatorias en el
header. Esa distinción entre "algo pasó con una fila" y "el archivo en sí
está mal armado" es la que uso en todo el sistema:
`InvalidCsvFormatException` corta todo, un error de fila normal no.

## 3. Cada regla de negocio es una clase separada

RN-01 a RN-04 (el tope diario de puntos, la proporción de redenciones
sospechosas, el límite de transacciones por día, la ventana de fechas
válida) las escribí como clases independientes que implementan la misma
interfaz (`infrastructure/validators/rules/`), y un compositor
(`BusinessRulesValidator`) las corre todas y junta los resultados. La
alternativa obvia era un método gigante con un `if` por regla la descarté
apenas la escribí en mi cabeza, porque entender o testear una regla
individual hubiera significado leer las otras tres primero. Con clases
separadas, cada una se testea sola, y si FinCard agrega una RN-05 el día de
mañana, es una clase nueva en la lista, no una cirugía en un bloque
existente.

Dos detalles de cómo interpreté las reglas, porque el enunciado no los deja
100% cerrados:

- **RN-01 y RN-03 dependen del orden de las filas en el archivo.** Cuando un
  miembro acumula más de 10.000 puntos en el día, entiendo que las
  transacciones "adicionales" son las que llegan *después* de cruzar ese
  límite, las que ya estaban antes de cruzarlo quedan válidas. Mismo
  criterio para el límite de 5 transacciones diarias con el mismo aliado.
- **RN-02 es distinta: es una proporción, no una secuencia.** Si un aliado
  supera el 30% de transacciones diarias con canje, no hay una "adicional"
  que señalar, marco todas las transacciones con canje de ese aliado ese
  día, porque la señal de fraude es el conjunto, no una fila puntual. Ojo
  con un caso borde real: si un aliado tuvo una sola transacción en el día y
  esa fue un canje, técnicamente da 100% > 30% y queda marcada. Lo dejé así
  a propósito y está cubierto en los tests.

Y una limitación que sí quiero dejar explícita: estas reglas evalúan
únicamente las transacciones del archivo que se está subiendo en ese
momento, no las que ya se procesaron en cargas anteriores el mismo día. Si
un mismo miembro reparte sus transacciones entre dos archivos distintos, el
sistema no ve el acumulado real entre ambos. Resolverlo bien implica leer
el historial del día desde el repositorio antes de evaluar el batch nuevo,
y decidir qué pasa si un archivo se reprocesa, quedó fuera del alcance que
me di.

## 4. `net_points_owed` nunca es negativo hacia afuera, pero por dentro sí

Si un aliado liquidó más puntos de los que ganó (raro, pero el enunciado lo
contempla), el neto real es negativo. La respuesta de la API nunca muestra
ese negativo, se expone como `0`, porque conceptualmente significa "el
aliado no le debe nada a FinCard, más bien al revés". Pero el cálculo
interno (`rawNetPoints` en `SettlementCalculator`) sí guarda el valor real,
por si en el futuro hace falta para una alerta o una auditoría.

## 5. La persistencia es JSON Lines en archivos, no una base de datos

No hay ningún requerimiento que pida una base de datos real para las
transacciones, el enunciado permite emular todo con filesystem. Usar
SQLite o levantar un Postgres para esta prueba me pareció peso de más, así
que `FileTransactionRepository` y `FileFlaggedTransactionRepository`
escriben líneas de JSON en archivos append-only, y las consultas filtran en
memoria.

Esto tiene un techo obvio de escala, y lo medí para no quedarme con la duda:
escribiendo una línea por transacción (un `appendFile` por fila), subir un
archivo de 20.000 filas tardaba **14.8 segundos**, casi todo ese tiempo era
I/O de disco secuencial, no la validación en memoria, que por sí sola
tardaba apenas 113ms para el mismo volumen. Cambié eso a un solo
`appendFile` con el batch entero ya armado, y el mismo archivo de 20.000
filas bajó a **0.39 segundos**. Sigue sin ser la solución para cientos de
miles de filas regulares, ahí ya hace falta un proceso asíncrono en cola y,
en el mundo real, algo como Redshift, pero para el volumen que este
ejercicio maneja (miles de filas por archivo) alcanza, y el punto
completo de que `ITransactionRepository` sea una interfaz es que cambiar la
implementación por Postgres o DynamoDB el día de mañana no toca una sola
línea del dominio.

## 6. El parser de CSV lo escribí a mano

El formato que pide el enunciado es siete columnas fijas, sin casos raros de
delimitadores ni encodings exóticos. Traer una librería completa de CSV para
esto con todas las opciones que trae una librería genérica me pareció
más código del que el problema necesita. Terminó siendo un archivo pequeño que
soporta lo mínimo de RFC4180 que hace falta (campos entre comillas, comillas
escapadas, comas dentro de un campo), con sus propios tests. Si en algún
momento entran CSVs más raros (campos multilínea, otros delimitadores), ahí
sí se justifica traer una librería.

## 7. El upload es un archivo real (`multipart/form-data`), no texto pegado

Al principio implementé el upload aceptando el CSV como el cuerpo crudo del
request, con `Content-Type: text/csv` — evitaba sumar una dependencia. Pero
releyendo el enunciado, "reciba un archivo CSV" es un requisito funcional,
no un detalle de implementación: un archivo de verdad tiene nombre y
extensión que se pueden validar, un texto pegado no. Volví atrás, agregué
`@fastify/multipart`, y ahora el endpoint exige de verdad un archivo en el
campo `file`, valida que termine en `.csv` antes de leer nada, y recién ahí
llama al caso de uso (que sigue sin saber ni importarle si el string vino de
un archivo o de otro lado eso lo maneja el controller).

De paso con este cambio encontré un bug real: el manejador de errores
global devolvía `500` para cualquier error, incluyendo el `415` que Fastify
ya generaba correctamente cuando el content-type no es el esperado. Lo
arreglé para que respete el código de estado real en errores 4xx, y solo
oculte el detalle cuando es un 5xx de verdad.

## 8. Swagger con selector de archivo real, y una lección sobre mutación de schemas

Quería que el botón "Try it out" de Swagger mostrara un selector de archivo
de verdad, no que dijera "pegá el contenido acá". `@fastify/multipart` trae
justo lo necesario para eso: `ajvFilePlugin`, que agrega una keyword `isFile`
a la validación en el momento de compilar el schema, la reescribe al
formato que Swagger UI reconoce como upload de archivo, y valida en tiempo
real que lo que llegó sea de verdad un archivo.

## 9. Vitest en vez de Jest

El enunciado pide pruebas automatizadas sin exigir una herramienta
específica. Elegí Vitest porque corre TypeScript nativo sin configuración
adicional (nada de `ts-jest` ni transformadores extra), la forma de escribir
los tests es prácticamente idéntica a Jest, y arranca más rápido. Es una
decisión de herramienta, no de arquitectura, si en algún momento hiciera
falta cambiar a Jest, sería un cambio mecánico.
