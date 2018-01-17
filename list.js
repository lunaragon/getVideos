const commander = require("commander")
const Promise = require('bluebird')
const redis = require("redis")
const asy = require('async')
const util = require("util")
const cp = require('child_process')

// variable definition
const MAX_MAGIC_PAGE_NUMBER = 20
let START_MAGIC_PAGE_NUMBER = 2

const redis_host = process.env['redis.crawler']
const videoList_queue_key = 'videoList_queue'
const videoList_set_key = 'videoList_set'
const videoInfo_queue_key = 'videoInfo_queue'

// promisify initialization
Promise.promisifyAll(redis)
const execAsync = util.promisify(cp.exec)

// database init
const redis_client = redis.createClient({host: redis_host,port: 6379})

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
const list_q = asy.queue(ListWorker, commander.concurrency)


Run()

// ================================================================================
async function Run() {
    // Push start queue to redis client
    while(START_MAGIC_PAGE_NUMBER++ < MAX_MAGIC_PAGE_NUMBER){
        redis_client.lpush(videoList_queue_key, JSON.stringify({
            page_number : START_MAGIC_PAGE_NUMBER,
            tries : commander.tries
        }))
    }

    // Start job!
    while (true) {
        try {
            // Progress speed control
            if (list_q.length() > commander.waiting){
                Promise.delay(1000)
                continue
            }

            // Retrieve a job from video_list queue of redis client
            let list_task = await redis_client.rpopAsync(videoList_queue_key)
            if (!list_task) console.log(`Video list job have finished`)
            
            // push this task to our queue
            list_q.push(JSON.parse(list_task))

        } catch (error) {
            console.log('Got an error:' + error)
        }
        
    }
    console.log('END')
}

async function ListWorker(task) {
    try{
        // Start video-list-crawler
        const {stdout, stderr} = await execAsync('node video-list-crawler.js', {
            cwd: __dirname,
            env: {
                "PAGE_NUMBER": `${task.page_number}`
            }
        })

        // get video list array and push it into an queue (use redis set to remove repeated item)
        const crawler_output = JSON.parse(stdout)

        // current task failed
        if (crawler_output.status != 'success'){
            // minus one of its try times, push it into redis queue again if its try times haven't been exhausted
            if (task.tries-- != 0) return redis_client.lpush(videoList_queue_key, JSON.stringify(task))

            return console.log(`Get Page ${task.page_number} failed after ${command.tries} times`)
        }

        // Parse video-list-crawler
        parse_ListWorker_result(crawler_output)
    }catch(error){
        console.log(error)
    }
}

async function parse_ListWorker_result(crawler_output){
    for (let video_url of crawler_output.urls){
        // add this url to video queue if current video url have not been resolved
        if (!await redis_client.sismemberAsync(videoList_set_key, video_url)){
            redis_client.sadd(videoList_set_key, video_url)
            redis_client.lpush(videoInfo_queue_key, { video_url })
        }
    }
}

// debug
function debugTest() {
    console.log(`length: ${list_q.length()}`)
    console.log(`running: ${list_q.running()}`)
    // console.log(`length: ${list_q.length()}`)
    // console.log(`length: ${list_q.length()}`)
}