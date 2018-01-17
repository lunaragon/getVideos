const request = require('superagent')
const commander = require("commander")
const Promise = require('bluebird')
const redis = require("redis")
const asy = require('async')
const fs = require('fs-extra')
const crypto = require('crypto')

const config = require('./config')

// variable definition
const redis_host = process.env['SERVER_REDIS'] || 'localhost'
const videoSource_queue_key = config.redis.videoSource_queue_key

// promisify initialization
Promise.promisifyAll(redis)

// database init
const redis_client = redis.createClient({host: redis_host,port: 6379})

// directory making
fs.ensureDirSync(config.download_path)

// Command Line Parameters Parsing
commander.version("2.0")
    .option('-c, --concurrency [value]', 'Concurrency Number of Requesting url', 5)
    .option('-w, --waiting [value]', 'The Number of tasks waiting in Queue', 5)
    .option('-t, --tries [value]', 'The Number of try times when a crawler task is failed', 3)
    .parse(process.argv)


// Create Task Queue
const download_q = asy.queue(DownloadWorker, commander.concurrency)

Run()

// ================================================================================
async function Run() {
    // Start job!
    while (true) {
        try {
            // Progress speed control
            if (download_q.length() > commander.waiting){
                await Promise.delay(1000)
                continue
            }

            // Retrieve a job from video_list queue of redis client
            let download_task = await redis_client.rpopAsync(videoSource_queue_key)
            if (!download_task) {
                console.log('download queue have no job now, wait for 10 seconds')
                await Promise.delay(10 * 1000)
                continue
            }
            download_task = JSON.parse(download_task)
            download_task.tries = commander.tries

            // push this task to our queue
            download_q.push(download_task)
        } catch (error) {
            console.log('Got an error:' + error)
        }
        
    }
    console.log('END')
}

async function DownloadWorker(task) {
    try{
        // open a write stream and download url
        const stream = fs.createWriteStream(`${config.download_path}/${md5(task.download_url)}.mp4`);
        const req = request.get(task.download_url);
        req.pipe(stream);
        console.log(`Download video ${task.download_url} complete.`)
    }catch(error){
        console.log(error)
    }
}

function md5(data) {
    return crypto.createHash('md5')
        .update(data)
        .digest('hex')
}