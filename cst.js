const Constants = {
    YOURURL: '',
    TITLEBOOK: 'header.entry-header h1',
    COVERBOOK: 'div.wp-block-image figure > img',
    CHAPTERURL: 'div.entry-content p > a', 
    NUMCHAP: '//header[@class="entry-header"]//h1 | //header[@class="entry-header"]//h2 | //main//header//h1',
    TITLECHAP: '//div[@class="entry-content"]/div/p//strong',
    CONTENT: '//div[@class="entry-content"]/div/p[@style="text-align:justify;"]',
    IMG: '//div[@class="entry-content"]//img',
    PWPATH: '//input[@name="post_password"]',
    PW: 'seme | satvunquatcuong',
}

module.exports = Constants;