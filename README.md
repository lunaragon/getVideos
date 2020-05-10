# 很久没有更新了, 现在不能用了...

# Requirements

 * docker
 * node (v8.x+)

# Start
1. download and install dependency
```bash
git clone https://github.com/FarmerSun/getVideos.git
cd getVideos/crawler && npm i
```
2. start docker container
```bash
docker run -d -p 6379:6379 --name redis.crawler redis
docker run -d -p 27017:27017 --name mongo.crawler mongo
```

3. run the start job
```bash
node list.js
node video.js
node download.js
```

# Enjoy it
