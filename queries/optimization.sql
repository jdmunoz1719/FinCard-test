-- FinCard - Datos & SQL avanzado
-- Tabla origen (Redshift): transactions (transaction_id, member_id, partner_id,
-- points_earned, points_redeemed, transaction_date, partner_name, processed_at)
-- ~500 millones de filas


-- =====================================================================
-- CONSULTA 1: Liquidacion mensual por aliado, ultimos 12 meses (Redshift)
-- =====================================================================
-- Salida: partner_id | partner_name | year_month | total_earned | total_redeemed | net_owed

SELECT
    t.partner_id,
    t.partner_name,
    TO_CHAR(t.transaction_date, 'YYYY-MM')            AS year_month,
    SUM(t.points_earned)                               AS total_earned,
    SUM(t.points_redeemed)                             AS total_redeemed,
    SUM(t.points_earned) - SUM(t.points_redeemed)      AS net_owed
FROM transactions t
WHERE t.transaction_date >= DATEADD(month, -12, DATE_TRUNC('month', GETDATE()))
GROUP BY
    t.partner_id,
    t.partner_name,
    TO_CHAR(t.transaction_date, 'YYYY-MM')
ORDER BY t.partner_id, year_month;


-- =====================================================================
-- CONSULTA 2: Misma liquidacion, optimizada para Athena/Parquet
-- =====================================================================
-- Tabla destino en Glue Data Catalog: fincard_loyalty.transactions_parquet,
-- particionada por year/month (plan de particionamiento mas abajo).
--
-- Vs la version de Redshift: filtra por las columnas de PARTICION (year,
-- month) en vez de una funcion sobre transaction_date, asi Athena hace
-- partition pruning real (ni abre los archivos descartados). Y solo lista
-- las columnas necesarias (nunca SELECT *) -- en Parquet columnar eso baja
-- directo los bytes escaneados, que es la base del costo ($5/TB).

SELECT
    partner_id,
    partner_name,
    year_month,
    SUM(points_earned)                          AS total_earned,
    SUM(points_redeemed)                        AS total_redeemed,
    SUM(points_earned) - SUM(points_redeemed)   AS net_owed
FROM fincard_loyalty.transactions_parquet
WHERE (year || '-' || month) >= date_format(date_add('month', -12, current_date), '%Y-%m')
GROUP BY partner_id, partner_name, year_month
ORDER BY partner_id, year_month;

-- --------------------------------------------------------------------
-- 3 estrategias para reducir costo de computo en Athena
-- --------------------------------------------------------------------
-- 1) Particionamiento + partition projection
--    Particionar por year/month deja que Athena descarte particiones enteras
--    antes de leer un byte. Usar "partition projection" (config en las
--    propiedades de la tabla de Glue) en vez de MSCK REPAIR TABLE / crawlers
--    periodicos, para que particiones nuevas esten disponibles sin recrawl.
--
-- 2) Columnar + compresion + proyeccion de columnas
--    Parquet + Snappy/ZSTD reduce bytes en disco (~10x vs CSV) y permite leer
--    solo las columnas que el SELECT/WHERE/GROUP BY referencia. Regla dura:
--    nunca "SELECT *" sobre estas tablas.
--
-- 3) Tablas resumen pre-agregadas (CTAS incremental)
--    Si la liquidacion mensual se consulta seguido, materializarla con
--    CREATE TABLE AS SELECT en un job diario/mensual (ej. hacia
--    fincard_loyalty.settlements_monthly, particionada por year_month). Los
--    reportes leen esa tabla (miles de filas) en vez de escanear los 500M+.
--
-- Extra:
--    - Compactar archivos pequeños (objetivo ~128-256MB) para evitar overhead
--      de abrir muchisimos archivos pequenos.
--    - Athena workgroup con "query result reuse" para consultas repetidas con
--      los mismos parametros dentro de una ventana de tiempo.

-- --------------------------------------------------------------------
-- Plan de particionamiento (tabla Athena sobre S3/Parquet)
-- --------------------------------------------------------------------
-- s3://fincard-datalake/transactions/year=2026/month=07/part-0000.parquet
--
-- Particionar por year + month, NO por partner_id: con ~4 aliados hoy,
-- sumar partner_id multiplicaria particiones/archivos pequeños sin beneficio
-- (las queries ya filtran por partner_id en WHERE/GROUP BY, no necesitan
-- pruning a ese nivel). year/month acota bien el volumen para el caso de uso
-- principal ("ultimos 12 meses") y mantiene las particiones manejables
-- (12/anio), evitando el problema de "small files".
--
-- Dentro de cada particion, ordenar por partner_id al escribir el Parquet
-- mejora la compresion por columna y el predicate pushdown al filtrar por
-- partner_id.
--
-- DDL de ejemplo (partition projection, sin ALTER TABLE ADD PARTITION):
--
-- CREATE EXTERNAL TABLE fincard_loyalty.transactions_parquet (
--   transaction_id   string,
--   member_id        string,
--   partner_id       string,
--   partner_name     string,
--   points_earned    int,
--   points_redeemed  int,
--   transaction_date date,
--   processed_at     timestamp
-- )
-- PARTITIONED BY (year string, month string)
-- STORED AS PARQUET
-- LOCATION 's3://fincard-datalake/transactions/'
-- TBLPROPERTIES (
--   'projection.enabled' = 'true',
--   'projection.year.type' = 'integer',
--   'projection.year.range' = '2022,2030',
--   'projection.month.type' = 'integer',
--   'projection.month.range' = '1,12',
--   'projection.month.digits' = '2',
--   'storage.location.template' = 's3://fincard-datalake/transactions/year=${year}/month=${month}/'
-- );

-- --------------------------------------------------------------------
-- Por que Parquet gana a CSV
-- --------------------------------------------------------------------
-- 1) Columnar: CSV obliga a leer la fila completa aunque el SELECT pida 3 de
--    8 columnas. Parquet lee solo los column chunks pedidos -> menos bytes
--    escaneados -> menor costo directo.
-- 2) Compresion por tipo de columna (dictionary encoding para strings de baja
--    cardinalidad como partner_id, RLE para booleanos, etc): ratios muy
--    superiores a comprimir un CSV entero como texto plano.
-- 3) Estadisticas embebidas (min/max/null count por column chunk): permiten
--    predicate pushdown, Athena descarta chunks enteros sin leerlos si el
--    filtro no puede matchear ese rango (ej. transaction_date).
-- 4) Splittable: se lee en paralelo por multiples workers, sin parsear el
--    archivo completo secuencialmente como un CSV.
-- 5) Tipado nativo: sin overhead de parsear/castear texto a INT/DATE, los
--    tipos ya estan en el schema del archivo.


-- =====================================================================
-- CONSULTA 3: Deteccion de anomalias (cambio >50% vs mes anterior)
-- =====================================================================
-- Salida: partner_id | partner_name | current_month | current_net | prev_month | prev_net | pct_change

WITH monthly_net AS (
    SELECT
        partner_id,
        MAX(partner_name)                              AS partner_name,
        DATE_TRUNC('month', transaction_date)          AS month,
        SUM(points_earned) - SUM(points_redeemed)      AS net_points
    FROM transactions
    GROUP BY partner_id, DATE_TRUNC('month', transaction_date)
),
with_previous AS (
    SELECT
        partner_id,
        partner_name,
        month,
        net_points,
        LAG(net_points) OVER (PARTITION BY partner_id ORDER BY month)  AS prev_net_points,
        LAG(month) OVER (PARTITION BY partner_id ORDER BY month)       AS prev_month
    FROM monthly_net
)
SELECT
    partner_id,
    partner_name,
    TO_CHAR(month, 'YYYY-MM')                                          AS current_month,
    net_points                                                          AS current_net,
    TO_CHAR(prev_month, 'YYYY-MM')                                      AS prev_month,
    prev_net_points                                                     AS prev_net,
    ROUND(
        (net_points - prev_net_points)::numeric
        / NULLIF(ABS(prev_net_points), 0) * 100,
        2
    )                                                                    AS pct_change
FROM with_previous
WHERE prev_net_points IS NOT NULL
  AND ABS(net_points - prev_net_points) > 0.5 * ABS(prev_net_points)
ORDER BY ABS(net_points - prev_net_points) DESC;

-- NULLIF(ABS(prev_net_points), 0) evita division por cero cuando el mes
-- anterior tuvo net_points = 0 (ej. aliado nuevo sin actividad previa); esas
-- filas quedan con pct_change = NULL en vez de reventar la consulta.
