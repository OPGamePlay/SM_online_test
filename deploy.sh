
echo "Updating Digital Ocean App" 
npm run headless-build-only
# From https://gist.github.com/DarrenN/8c6a5b969481725a4413
PACKAGE_VERSION=$(cat package.json \
  | grep version \
  | head -1 \
  | awk -F: '{ print $2 }' \
  | sed 's/[ ",]//g')

SEASHELL_IMAGE_PATH=registry.digitalocean.com/jdoleary-containers/smms
echo "Package Version:$PACKAGE_VERSION"
docker build . -t "$SEASHELL_IMAGE_PATH:latest" -t "$SEASHELL_IMAGE_PATH:$PACKAGE_VERSION"
docker push "$SEASHELL_IMAGE_PATH:latest"
docker push "$SEASHELL_IMAGE_PATH:$PACKAGE_VERSION"

PUBLIC_IMAGE_PATH=jordanoleary/spellmasons-server
docker build . -t "$PUBLIC_IMAGE_PATH:latest" -t "$PUBLIC_IMAGE_PATH:$PACKAGE_VERSION"
docker push "$PUBLIC_IMAGE_PATH:$PACKAGE_VERSION"
docker push "$PUBLIC_IMAGE_PATH:latest"

echo "Pushed image to Digital Ocean" 
echo "Don't Forget to manually update any apps that are using the hub.docker.com image such as the Walrus server"