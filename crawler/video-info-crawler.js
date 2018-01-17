const Nightmare = require('nightmare');
const nightmare = Nightmare({show: true});

const video_page_url = process.env['VIDEO_URL']

/*
* when other process get this output, he should check status first
* use output.urls only status is equal to 'success'
* when something get error, error will be set in output.error and status
* will set to 'error'
*/ 
const crawler_output = {
    status:'success'
}

Run()

// ========================================================================
async function Run() {
    await get_video_info(`${video_page_url}`)
    //await get_video_info(`http://www.pornhub.com/view_video.php?viewkey=ph5a0cc1ba62145`)
    
    // output encode json string
    console.log(JSON.stringify(crawler_output))
}

// use nightmare as crawler-backend
async function get_video_info(video_page_url) {
    await nightmare
        .goto(video_page_url)
        .evaluate(() => {
            return new Promise((resolve, reject) => {
                try {
                    const video = document.querySelector('#player div.playerFlvContainer video > source')
                    const video_url = video.attributes.src.nodeValue || 'failed_to_get'
                    const video_name = document.querySelector('div.title-container h1.title > span').textContent || 'failed_to_get'
                    let video_categories = document.querySelectorAll('div.video-detailed-info div.categoriesWrapper > a')
                    let video_categories_array = Array.from(video_categories).map(v => v.textContent) || []
                    resolve({
                        name: video_name,
                        url: video_url,
                        categories: video_categories_array
                    })
                } catch (error) {
                    reject(error)
                }
            })
        })
        .end()
        .then((video_info) => {
            crawler_output.video = video_info
            crawler_output.video.base_url = video_page_url
        })
        .catch((error) => {
            crawler_output.status = 'error'
            crawler_output.error = error
        });
}



