const commander = require("commander")
const Promise = require('bluebird')
const redis = require("redis")
const asy = require('async')
const util = require("util")
const cp = require('child_process')
const mongoose = require('mongoose')

const VideoMetaModel = require('./VideoSchema')
const config = require('./config')

// variable definition
const mongodb_host = process.env['SERVER_MONGO'] || 'localhost'
const mongo_uri = `mongodb://${mongodb_host}/${config.db}`

const redis_host = process.env['SERVER_REDIS'] || 'localhost'
const videoInfo_queue_key = config.redis.videoInfo_queue_key
const videoSource_set_key = config.redis.videoSource_set_key
const videoSource_queue_key = config.redis.videoSource_queue_key

// promisify initialization
Promise.promisifyAll(redis)
const execAsync = util.promisify(cp.exec)

// database init
const redis_client = redis.createClient({host: redis_host,port: 6379})
mongoose.connect(mongo_uri, {useMongoClient:true})

// Statstistic Status
const stats = {
    completed: 0,
    failed: 0
}

// Command Line Parameters Parsing
commander.version("2.0")
    .option('-c, --concurrency [value]', 'Concurrency Number of Requesting url', 5)
    .option('-w, --waiting [value]', 'The Number of tasks waiting in Queue', 5)
    .option('-t, --tries [value]', 'The Number of try times when a crawler task is failed', 1)
    .parse(process.argv)


// Create Task Queue
const video_q = asy.queue(VideoWorker, commander.concurrency)


Run()

// ================================================================================
async function Run() {
    // Start job!
    while (true) {
        try {
            // Progress speed control
            if (video_q.length() > commander.waiting){
                await Promise.delay(1000)
                continue
            }

            // Retrieve a job from videoInfo queue of redis client
            let video_info_task = await redis_client.rpopAsync(videoInfo_queue_key)
            if (!video_info_task){
                console.log('Failed to get video url now, delay 10s to retry')
                await Promise.delay(10 * 1000)
                continue
            } 
            
            // push this task to our queue
            video_q.push(JSON.parse(video_info_task))

        } catch (error) {
            console.log('Got an error:' + error)
        }
        
    }
    console.log('END')
}


async function VideoWorker(task) {
    try {
        const {stdout, stderr} = await execAsync('node video-info-crawler.js', {
            cwd: __dirname,
            env: {
                "VIDEO_URL": task.url
            }
        })
        // get video list array and push it into an queue (use redis set to remove repeated item)
        const crawler_output = JSON.parse(stdout)

        // current task failed
        if (crawler_output.status != 'success'){
            // minus one of its try times, push it into redis queue again if its try times haven't been exhausted
            if (task.tries-- != 0) return redis_client.lpush(videoInfo_queue_key, JSON.stringify(task))

            return console.log(`Get video ${task.url} failed after ${task.tries} times`)
        }

        // Parse video-list-crawler
        parse_VideoWorker_result(crawler_output.video)
    } catch (error) {
        console.log(error)
    }
}

async function parse_VideoWorker_result(video){
        // use redis set to remove repeate item
        if (await redis_client.sismemberAsync(videoSource_set_key, video.url))
            return // do nothing
        else{
            redis_client.sadd(videoSource_set_key, video.url)
            redis_client.lpush(videoSource_queue_key, JSON.stringify({
                download_url : video.url,
                name : video.name
            }))
            // push this infomration into database
            new VideoMetaModel({
                name:video.name, url:video.url, categories:video.categories, base_url:video.base_url
            }).save()
            console.log(video)
        }
}

