# Instructions for using docker, docker-compose, and mongo-cli

---

Install Docker:

```dosini
sudo apt-get update
sudo apt install docker.io
sudo apt install docker-compose
```

sudo groupadd docker
sudo usermod -aG docker $USER

````

[start terminal again]
```dosini
newgrp docker
````

Test that docker works:

```dosini
docker run hello-world
```

Configure to start docker after boot:

```dosini
sudo systemctl enable docker.service
sudo systemctl enable containerd.service
```

---

To start mongo container with docker-compose in detached (-d) mode:

```dosini
docker-compose up -d
```

To stop docker container with docker-compose:

```dosini
docker-compose down
```

To list things in docker:

```dosini
docker ps -a = list all containers (or 'docker container ls')
docker image ls = list all images
docker volume ls = list all volumes
```

To clean/remove docker containers, images, and volumes:

```dosini
docker container rm [name or beginning of id]
docker image rm [name or beginning of id]
docker volume prune = delete all volumes
```

To start mongo container without docker-compose (use docker-compose though):

```dosini
docker container run --name beacondb --publish 27017:27017 -d mongo
```

To go inside the container:

```dosini
docker exec -it beacondb bash
```

To access mongo cli:

```dosini
mongo
```

Mongo Shell useful commands:

```dosini
db (shows current db)
show dbs (list all dbs)
use [dbname] (switch to use another db)
show collections (show current db's collections)
db.[collectionname].find() (show all documents in collection)
db.[collectionname].find().length() (get the document count of a collection)
db.[collectionname].drop() (delete entire collection)
```

(in mongo cli) To change db:

```dosini
use beacondb
```

(in mongo cli) To create a specific user (add user and pass to app.js mongoose config as well if this is setup):

```dosini
db.createUser({ user: "username", pwd: "password", roles: [] })
```

(in mongo cli) To create a new collection:

```dosini
db.createCollection("users")
```

(in mongo cli) To save something in collection users (just an example):

```dosini
db.users.save({ user: "some-user-name" })
```

(in mong cli or the container) To exit/quit mongo cli and/or the container:

```dosini
exit
```
