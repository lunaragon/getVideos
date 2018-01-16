const Nightmare = require('nightmare');
const nightmare = Nightmare({
    show: true
});

const video_page_url = process.env['VIDEO_URL']

let video = {}

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
            video = video_info
            video.base_url = video_page_url
        })
        .catch((error) => {
            console.error('Search failed:', error);
        });
}

async function Run() {
    await get_video_info(`${video_page_url}`)

    console.log(JSON.stringify(video))
}

Run()


