# rustual-boy-www

Currently just a landing page for [Rustual Boy](https://github.com/emu-rs/rustual-boy).

## running locally

1. Update/install dependencies by running: `npm install` from the repo directory (safe to only do this once per pull)
2. Run the site: `node app`

The site will be available on [localhost:3000](http://localhost:3000). To use another port, you can specify a just-in-time environment variable like so: `httpPort=[port] node app`.

## running in deployment

Start the site: `sudo httpPort=80 pm2 start app.js`

Note that `pm2` is used to spawn the app in a separate process so that the ssh terminal isn't blocked while it's running. To monitor the process, use `sudo pm2 list`. It can be restarted using `sudo pm2 restart app`, and if absolutely necessary, all node processes can be killed using `sudo pm2 kill`.

## license

MIT (see [LICENSE](LICENSE))
