const path = require('path')
module.exports = {
    host : 'http://www.pornhub.com',
    mongo:{
        db:'video'
    },
    redis:{
        videoList_queue_key : 'videoList_queue',
        videoList_set_key : 'videoList_set',
        videoInfo_queue_key : 'videoInfo_queue',
        videoSource_queue_key :'videoSource_queue',
        videoSource_set_key : 'videoSource_set'
    },
    download_path:path.join(__dirname, '..', 'video_download')
}