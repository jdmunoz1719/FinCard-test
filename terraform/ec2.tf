# ---------------------------------------------------------------------------
# Red: usa la VPC/subnet default de la cuenta (suficiente para 1 instancia)
# ---------------------------------------------------------------------------
data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

# ---------------------------------------------------------------------------
# Security Group: SSH (22) restringido + puerto de la app publico
# ---------------------------------------------------------------------------
resource "aws_security_group" "app" {
  name        = "${var.project_name}-sg"
  description = "SSH + puerto de la API de liquidacion"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.allowed_ssh_cidr]
  }

  ingress {
    description = "API FinCard"
    from_port   = var.app_port
    to_port     = var.app_port
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.project_name}-sg" }
}

# ---------------------------------------------------------------------------
# Key pair SSH: se importa la clave PUBLICA generada localmente
# (fincard-deploy-key.pub, ver docs/DEPLOYMENT.md paso 1). La privada
# nunca pasa por Terraform.
# ---------------------------------------------------------------------------
resource "aws_key_pair" "deploy" {
  key_name   = "${var.project_name}-deploy-key"
  public_key = var.ssh_public_key
}

# ---------------------------------------------------------------------------
# AMI: Ubuntu 22.04 LTS mas reciente (owner oficial Canonical)
# ---------------------------------------------------------------------------
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"]

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }
  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# ---------------------------------------------------------------------------
# EC2: instancia unica. user_data instala Docker, clona el repo, y construye
# + levanta el contenedor con `docker compose up -d --build` -- todo pasa
# UNA sola vez al crear la instancia (sin pipeline CI/CD, sin ECR).
# ---------------------------------------------------------------------------
resource "aws_instance" "app" {
  ami                         = data.aws_ami.ubuntu.id
  instance_type               = var.instance_type
  subnet_id                   = data.aws_subnets.default.ids[0]
  vpc_security_group_ids      = [aws_security_group.app.id]
  key_name                    = aws_key_pair.deploy.key_name
  associate_public_ip_address = true

  user_data = templatefile("${path.module}/user_data.sh.tpl", {
    github_repo_url = var.github_repo_url
    github_branch   = var.github_branch
  })

  root_block_device {
    volume_size = 15
    volume_type = "gp3"
  }

  tags = { Name = var.project_name }
}
