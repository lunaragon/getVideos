const Nightmare = require('nightmare');
const nightmare = Nightmare({show: true});

const domain = "http://www.pornhub.com"
const pageNumber = process.env['PAGE_NUMBER']

// push all url get from page into this array
const video_raw_urls= []

async function get_video_url_by_page(page_url) {
    await nightmare
        .goto(page_url)
        .wait('ul.nf-videos li.videoblock div.phimage div.videoPreviewBg > a')
        .evaluate(() => {
            return new Promise((resolve, reject) => {
                try {
                    const video_list = document.querySelectorAll('ul.nf-videos li.videoblock div.phimage div.videoPreviewBg > a')
                    const video_array = Array.from(video_list).map(v => v.attributes.href.nodeValue)
                    resolve(video_array)
                } catch (error) {
                    reject(error)
                }
            })
        })
        .end()
        .then((urls) => {
            urls.forEach(url => {
                video_raw_urls.push(domain + url)
            })
        })
        .catch((error) => {
            console.error('Search failed:', error);
        });
}

async function Run(){
    await get_video_url_by_page(`https://www.pornhub.com/video?page=${pageNumber}`)
    
    // output decode array
    console.log(...video_raw_urls)
}

Run()
