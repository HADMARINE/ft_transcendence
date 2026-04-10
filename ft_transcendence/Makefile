IMAGE_NAME := devenv-ubuntu
CONTAINER_NAME := devenv-container
DOCKERFILE := devenv.dockerfile
PROJECT_DIR := $(shell pwd)
USER := root


.PHONY: all help build start stop restart shell logs clean rebuild attach status

all: build start shell

build:
	@echo " Construction de l'image Docker..."
	docker build -f $(DOCKERFILE) -t $(IMAGE_NAME) .
	@echo "Image construite avec succès !"

start:
	@if [ "$$(docker ps -a -q -f name=$(CONTAINER_NAME))" ]; then \
		if [ "$$(docker ps -q -f name=$(CONTAINER_NAME))" ]; then \
			echo "Le conteneur est déjà en cours d'exécution$(NC)"; \
		else \
			echo "Démarrage du conteneur existant...$(NC)"; \
			docker start $(CONTAINER_NAME); \
			echo "✅ Conteneur démarré !$(NC)"; \
		fi \
	else \
		echo " Création et démarrage du conteneur...$(NC)"; \
		docker run -d \
			--name $(CONTAINER_NAME) \
			--userns=host \
			--network=bridge \
			-p 3000:3000 \
			-p 61001:61001 \
			--privileged \
			-v /var/run/docker.sock:/var/run/docker.sock \
			-v $(PROJECT_DIR):/workspace \
			-w /workspace \
			$(IMAGE_NAME) \
			sleep infinity; \
		echo " Conteneur créé et démarré !$(NC)"; \
	fi

stop:
	@if [ "$$(docker ps -q -f name=$(CONTAINER_NAME))" ]; then \
		echo "⏸️  Arrêt du conteneur...$(NC)"; \
		docker stop $(CONTAINER_NAME); \
		echo "Conteneur arrêté !$(NC)"; \
	else \
		echo " Le conteneur n'est pas en cours d'exécution$(NC)"; \
	fi

restart: stop start

shell:
	@if [ ! "$$(docker ps -q -f name=$(CONTAINER_NAME))" ]; then \
		echo " Le conteneur n'est pas démarré. Démarrage...$(NC)"; \
		$(MAKE) start; \
	fi
	@echo "Génération des certificats...$(NC)"
	docker exec -u $(USER) $(CONTAINER_NAME) bash -lc "cd /workspace && bash ./generate-certs.sh"
	@echo "Mise à jour Yarn front...$(NC)"
	docker exec -u $(USER) $(CONTAINER_NAME) bash -lc "cd /workspace/front && yarn up"
	@echo "Mise à jour Yarn back...$(NC)"
	docker exec -u $(USER) $(CONTAINER_NAME) bash -lc "cd /workspace/back && yarn up"
	@echo "Arrêt des anciens serveurs de dev (si présents)...$(NC)"
	docker exec -u $(USER) $(CONTAINER_NAME) bash -lc "pkill -f '/[w]orkspace/back' || true"
	docker exec -u $(USER) $(CONTAINER_NAME) bash -lc "pkill -f '/[w]orkspace/front/node_modules/next/dist/bin/next dev' || true"
	@echo "Démarrage du front HTTPS en arrière-plan (yarn dev:https)...$(NC)"
	docker exec -d -u $(USER) $(CONTAINER_NAME) bash -lc "cd /workspace/front && yarn dev:https"
	@echo "Lancement du back dans ce terminal (yarn start:dev)...$(NC)"
	docker exec -it -u $(USER) $(CONTAINER_NAME) bash -lc "cd /workspace/back && yarn start:dev"

attach:
	@if [ ! "$$(docker ps -q -f name=$(CONTAINER_NAME))" ]; then \
		echo "  Le conteneur n'est pas démarré$(NC)"; \
		exit 1; \
	fi
	@echo " Attachement au conteneur...$(NC)"
	docker attach $(CONTAINER_NAME)

logs:
	@if [ "$$(docker ps -a -q -f name=$(CONTAINER_NAME))" ]; then \
		docker logs -f $(CONTAINER_NAME); \
	else \
		echo "  Le conteneur n'existe pas$(NC)"; \
	fi

status:
	@echo "$(BLUE)📊 Status du conteneur :$(NC)"
	@if [ "$$(docker ps -a -q -f name=$(CONTAINER_NAME))" ]; then \
		docker ps -a -f name=$(CONTAINER_NAME); \
	else \
		echo "  Le conteneur n'existe pas$(NC)"; \
	fi

clean:
	@echo " Nettoyage...$(NC)"
	@if [ "$$(docker ps -q -f name=$(CONTAINER_NAME))" ]; then \
		docker stop $(CONTAINER_NAME); \
	fi
	@if [ "$$(docker ps -a -q -f name=$(CONTAINER_NAME))" ]; then \
		docker rm $(CONTAINER_NAME); \
	fi
	@echo " Nettoyage terminé !$(NC)"

rebuild: clean build start
	@echo "Environnement reconstruit et démarré !$(NC)"

clean-all: clean clean-image
	@echo " Nettoyage complet terminé !$(NC)"