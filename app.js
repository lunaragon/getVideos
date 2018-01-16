const Promise = require('bluebird')
const redis = require("redis")
const asy = require('async')
const commander = require("commander")
const util = require("util")
const cp = require('child_process')
const execAsync = util.promisify(cp.exec)
const mongoose = require('mongoose')
const VideoMetaModel = require('./VideoSchema')

const MAX_MAGIC_PAGE_NUMBER = 20
let current_page_number = 2

Promise.promisifyAll(redis)

const uri = `mongodb://192.168.2.109/porn_video`
mongoose.connect(uri, {useMongoClient:true})

// New a Redis Client
const client = redis.createClient({
    host: '192.168.2.109',
    port: 6379
})

// Statstistic Status
const stats = {
    completed: 0,
    failed: 0
}

// Command Line Parameters Parsing
commander.version("2.0")
    .option('-c, --concurrency [value]', 'Concurrency Number of Requesting url', 5)
    .option('-w, --waiting [value]', 'The Number of tasks waiting in Queue', 5)
    .parse(process.argv)

// Create Task Queue
const list_q = asy.queue(ListWorker, commander.concurrency)
const video_q = asy.queue(VideoWorker, commander.concurrency)


Run()

async function Run() {

    while (true) {
        if (list_q.length() > commander.waiting) {
            await Promise.delay(1000)
            continue
        }

        if (current_page_number < MAX_MAGIC_PAGE_NUMBER) {
            list_q.push({
                page_number: current_page_number
            }, err => err ? null : stats.completed++)
            current_page_number++
        } else {
            break
        }
    }
    console.log('END')
}


async function ListWorker(task) {
    try{
        const {stdout, stderr} = await execAsync('node getVideoList.js', {
            cwd: __dirname,
            env: {
                "PAGE_NUMBER": `${task.page_number}`
            }
        })
        // get video list array and push it into an queue (use redis set to remove repeated item)
        const video_list = stdout.trim().split(' ')
        for (let video of video_list){
            let isIn = await client.sismemberAsync('video_set', video)
            if (isIn)
                console.log(`The ${video} has already exist.`)
            else{
                client.sadd('video_set', video)
                video_q.push({url:video})
                console.log(video)
            }
        }
    }catch(error){
        console.log(error)
    }
}

async function VideoWorker(task) {
    try {
        const {stdout, stderr} = await execAsync('node getVideoInfo.js', {
            cwd: __dirname,
            env: {
                "VIDEO_URL": task.url
            }
        })
        const video = JSON.parse(stdout)
        // use redis set to remove repeate item
        if (await client.sismemberAsync('video_source_set', video.url))
            return // do nothing
        else{
            client.sadd('video_source_set', video.url)
            // push this infomration into database
            new VideoMetaModel({
                name:video.name, url:video.url, categories:video.categories
            }).save()
            console.log(video.url)
        }
    } catch (error) {
        console.log(error)
    }
}

// debug
function debugTest() {
    console.log(`length: ${list_q.length()}`)
    console.log(`running: ${list_q.running()}`)
    // console.log(`length: ${list_q.length()}`)
    // console.log(`length: ${list_q.length()}`)
}