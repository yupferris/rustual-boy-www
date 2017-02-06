# rustual-boy-www

A basic landing page/blog for [Rustual Boy](https://github.com/emu-rs/rustual-boy).

## running locally

1. Update/install dependencies by running: `npm install` from the repo directory (safe to only do this once per pull)
2. Run the site: `node app`

The site will be available on [localhost:3000](http://localhost:3000). To use another port, you can specify a just-in-time environment variable like so: `httpPort=[port] node app`.

## running in deployment

Start the site: `sudo httpPort=80 useHttps=true pm2 start app.js`

Note that `pm2` is used to spawn the app in a separate process so that the ssh terminal isn't blocked while it's running. To monitor the process, use `sudo pm2 list`. It can be restarted using `sudo pm2 restart app`, and if absolutely necessary, all node processes can be killed using `sudo pm2 kill`.

## blog

The blog is built with [poet](http://jsantell.github.io/poet/), which means a couple things:
- Posts are stored as .md files in the `posts/` directory. We've configured poet to watch the posts dir, but its watcher isn't recursive by default, so we can't use subdirectories. Therefore, all posts follow a simple naming convention: `category-number-postname.md`. This way they can stay cleanly organized within this single folder.
- Post slugs are generated using the title of the post, so these can't be changed without also invalidating the post url.
- Post dates use the nonintuitive American format (M-D-Y)

## demo reel

Just in case I lose them later, here's the encoding settings used for the demo reel video:
```
ffmpeg.exe -i reel.mkv -c:v libvpx -qmin 0 -qmax 50 -crf 5 -b:v 1M -an -r 25 reel.webm

ffmpeg.exe -i reel.mkv -c:v libx264 -pix_fmt yuv420p -profile:v baseline -b:v 600k -pass 1 -level 3 -movflags +faststart -an -r 25 -f mp4 /dev/null && \
ffmpeg.exe -i reel.mkv -c:v libx264 -pix_fmt yuv420p -profile:v baseline -b:v 600k -pass 2 -level 3 -movflags +faststart -an -r 25 reel.mp4
```

## license

MIT (see [LICENSE](LICENSE))
