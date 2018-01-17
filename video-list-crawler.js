const Nightmare = require('nightmare');
const nightmare = Nightmare({show: true});
const fs = require('fs-extra')
const path = require('path')


const config = fs.readJSONSync(path.join(__dirname, 'config.json'))
const host = config.host

const pageNumber = process.env['PAGE_NUMBER']

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

// ==========================================================================
async function Run(){
    await get_video_url_by_page(`${host}/video?page=${pageNumber}`)
    //await get_video_url_by_page(`${host}/video?page=2`)
    
    // output encode json string
    console.log(JSON.stringify(crawler_output))
}

// use nightmare as crawler-backend
async function get_video_url_by_page(page_url) {
    await nightmare
        .goto(page_url)
        .wait('ul.nf-videos li.videoblock div.phimage div.videoPreviewBg > a')
        .evaluate(() => {
            return new Promise((resolve, reject) => {
                try {
                    /* 
                    * selector to get what we want
                    */
                    const video_list = document.querySelectorAll('ul.nf-videos li.videoblock div.phimage div.videoPreviewBg > a')
                    const urls_array = Array.from(video_list).map(v => v.attributes.href.nodeValue)
                    resolve(urls_array)
                } catch (error) {
                    reject(error)
                }
            })
        })
        .end()
        .then((urls) => {
            crawler_output.urls = urls
        })
        .catch((error) => {
            crawler_output.status = 'error',
            crawler_output.error = error
        });
}