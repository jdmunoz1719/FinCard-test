variable "aws_region" {
  description = "Region AWS donde se crea la EC2"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Prefijo de nombre para los recursos (tags, security group, key pair)"
  type        = string
  default     = "fincard-settlement"
}

variable "instance_type" {
  description = "Tipo de instancia EC2. t2.micro/t3.micro entran en el free tier."
  type        = string
  default     = "t3.micro"
}

variable "ssh_public_key" {
  description = "Contenido de la clave publica SSH (fincard-deploy-key.pub). Ver docs/DEPLOYMENT.md paso 1."
  type        = string
  sensitive   = true
}

variable "allowed_ssh_cidr" {
  description = "CIDR permitido para SSH (22). Usar tu IP publica + /32, no dejar abierto en real."
  type        = string
  default     = "0.0.0.0/0"
}

variable "app_port" {
  description = "Puerto donde la app queda expuesta (host y contenedor)"
  type        = number
  default     = 3000
}

variable "github_repo_url" {
  description = "URL HTTPS del repo publico a clonar en la EC2 (ej. https://github.com/usuario/FinCard-test.git)"
  type        = string
}

variable "github_branch" {
  description = "Branch a desplegar"
  type        = string
  default     = "main"
}
