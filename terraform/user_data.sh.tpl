#!/bin/bash
# Bootstrap de la EC2: AWS ejecuta este script UNA sola vez, como root,
# la primera vez que la instancia arranca (no corre de nuevo en reboots
# ni en redeploys posteriores eso lo hace el workflow de GitHub Actions).
# Deja la instancia con Docker instalado y la app corriendo.
set -euxo pipefail

# Actualiza el indice de paquetes e instala lo minimo para el paso
# siguiente: curl/gnupg para agregar el repo APT de Docker, git para clonar.
apt-get update -y
apt-get install -y ca-certificates curl gnupg git

# Docker no viene en los repos default de Ubuntu (o viene una version vieja);
# hay que agregar el repositorio oficial de Docker antes de poder instalarlo.
# Estos 3 pasos son el procedimiento estandar de docker.com para Ubuntu:
# 1) carpeta para la clave GPG del repo
install -m 0755 -d /etc/apt/keyrings
# 2) descargar la clave GPG que firma los paquetes de Docker (verifica
#    que lo que se instale despues sea realmente de Docker, no falsificado)
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc

# 3) registrar el repo APT de Docker, firmado con esa clave, apuntando a la
#    version de Ubuntu que esta corriendo esta instancia ($VERSION_CODENAME,
#    ej. "jammy") y a la arquitectura del procesador ($(dpkg --print-architecture))
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  | tee /etc/apt/sources.list.d/docker.list > /dev/null

# Con el repo ya registrado, instalar Docker Engine + el plugin de
# `docker compose` (comando que usa el Dockerfile/docker-compose.yml del repo).
apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Agrega el usuario "ubuntu" (el que usa el pipeline de deploy por SSH) al
# grupo "docker": sin esto, correr `docker` como ubuntu pediria sudo en
# cada comando. Necesario porque mas abajo el compose se corre como ubuntu,
# no como root, para que los archivos que Docker genera (ej. storage/)
# queden con el mismo que despues usa el pipeline de deploy.
usermod -aG docker ubuntu
systemctl enable docker
systemctl start docker

# Clonar el repo (rama que vino en la variable de Terraform github_branch,
# --depth 1 = solo el ultimo commit, no hace falta el historial completo
# para correr la app) directo en /app.
git clone --branch "${github_branch}" --depth 1 "${github_repo_url}" /app

# Este script corre como root, asi que git clone deja /app con root.
# Sin este chown, el `docker compose up` de la linea de abajo (que se corre
# como ubuntu) fallaria al intentar escribir en /app/storage.
chown -R ubuntu:ubuntu /app

# Aunque /app ya es de ubuntu, git ADEMAS chequea que el usuario que corre
# el comando sea el mismo que creo el repo (proteccion contra ejecutar git
# en carpetas de otro dueño sin saberlo). Como el `git clone` de arriba lo
# hizo root, git recordaria a root como dueño "de confianza" del repo,
# y el pipeline de GitHub Actions (que entra por SSH como ubuntu) fallaria
# con "detected dubious ownership" al intentar hacer `git pull` mas tarde.
# Esta linea le dice a git, para TODOS los usuarios del sistema, que /app
# es una carpeta segura para operar sin importar quien la creo.
git config --system --add safe.directory /app

cd /app
# `sudo -u ubuntu` (no simplemente "docker compose ..." como root): el
# contenedor queda corriendo bajo el usuario ubuntu, consistente con quien
# lo va a re-buildear despues en cada deploy (el workflow de GitHub Actions
# se conecta como ubuntu) -- evita mezclar archivos con dueño root y dueño
# ubuntu en la misma carpeta storage/ entre un deploy y el siguiente.
sudo -u ubuntu docker compose up -d --build
