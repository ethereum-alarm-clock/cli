# Scheduling-Bot Dockerfiles

To deploy one of the Dockerfiles to Heroku, change the name from `Dockerfile.*` to `Dockerfile` and run through the Heroku push and release method for the correct app name.

## Heroku flow

- Build docker image `docker build . --no-cache`
- Run `heroku login` and use chronologic admin login.
- Run `heroku container:login`
- Select the name of the app to work on from step 2. e,g `eac-cli-kovan-100-0x4d5e69`
- Run `heroku container:push worker -a APP_NAME`
- Run `heroku container:release worker -a APP_NAME`
