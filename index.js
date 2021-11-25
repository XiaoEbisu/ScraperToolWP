const puppeteer = require("puppeteer");
const fs = require("fs");
const download = require("image-downloader");
const Constants = require("./cst");

(async () => {
  //Open browser
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(Constants.YOURURL, { waitUntil: "load" });

  //Find Book Name
  const NameBook = await page.evaluate((queryTitle) => {
    let nameElement = document.querySelector(queryTitle);
    return nameElement.textContent;
  }, Constants.TITLEBOOK);
  console.log(NameBook);

  //Find Cover book img
  const imgLink = await page.evaluate((Constants) => {
    let imgElement = document.querySelector(Constants.COVERBOOK);
    let imgLink = imgElement.getAttribute("src");
    return imgLink;
  }, Constants);
  console.log(imgLink);

  // directory path
  const dir = "./" + NameBook + "/";

  let createDir = (dirName) => {
    fs.mkdir(dirName, (err) => {
      if (err) {
        throw err;
      }
      console.log("New book is creating ...");
    });
  };

  // create new directory
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
    createDir(dir);
  } else {
    createDir(dir);
  }

  //Download Cover book img
  let name;
  await download
    .image({
      url: imgLink,
      dest: dir,
    })
    .then(({ filename }) => {
      name = filename.replace(/^.*[\\\/]/, "");
    });

  //Create file cover for Ebook
  let coverContent =
    "<html xmlns='http://www.w3.org/1999/xhtml' xml:lang='en'><head><title>Cover</title><style type='text/css' title='override_css'>@page {padding: 0pt; margin:0pt}body { text-align: center; padding:0pt; margin: 0pt; }div { margin: 0pt; padding: 0pt; }</style></head><body class='fff_coverpage'><div><img src='" +
    name +
    "' alt='cover'/></div></body></html>";

  fs.appendFile(dir + "#cover.xhtml", coverContent, function (err) {
    if (err) throw err;
    console.log("Cover update!");
  });

  //Crawl all chapter url
  const articles = await page.evaluate((Constants) => {
    //let titleLinks = document.querySelectorAll("figure.wp-block-table td > a");
    let titleLinks = document.querySelectorAll(Constants.CHAPTERURL);
    titleLinks = [...titleLinks];
    let articles = titleLinks.map((link) => ({
      title: link.text,
      url: link.getAttribute("href"),
    }));
    return articles;
  }, Constants);

  //For each ChapterUrl
  for (let i = 0; i < articles.length; i++) {
    if (!articles[i]) continue;

    let url = articles[i].url;
    console.log(url);

    //check if wp
    if (!url.includes("wordpress.com")) {
      continue;
    }

    // let [res] = (await page.$x('//h1[@class="entry-title"]'));
    // res = await res.getProperty('textContent');
    // let name = await res.jsonValue();
    // console.log("my res : " + name);
    // if(!res){
    //   continue;
    // }

    //Go in ChapterUrl
    await page.goto(url);

    //Type Password if needed
    /*
    console.log("before pw");
    await page.$eval(
      "input[name=post_password]",
      (el) => (el.value = "chonve")
    );
    await page.$eval("input[type=submit]", (el) => el.click());
    console.log("after password");
    */

    //Wait for navigation ready
    //await page.waitForNavigation();

    //Take Chapter Number Title in Header
    let numChap = await page.evaluate(
      (el) => { return el.textContent; },
      (await page.$x(Constants.NUMCHAP))[0]
    );

    //Take Chapter Content
    let listofp = await page.$x(Constants.CONTENT);

    /*Make a String var to hold "Chapter Content"*/
    let header =
      "<?xml version='1.0' encoding='utf-8'?><html xmlns='http://www.w3.org/1999/xhtml'><head>";

    let content =
      header +
      "<title>" +
      numChap +
      "</title>" +
      "</head><body>" +
      "<h1>" +
      numChap +
      "</h1>";

    for (var j = 0; j < listofp.length; j++) {
      let myp = await page.evaluate((el) => el.outerHTML, listofp[j]);
      content += myp;
    }

    content = content + "</body></html>";

    //Create & Write into file
    fs.appendFile(dir + i + ".xhtml", content, function (err) {
      if (err) throw err;
      console.log("Chapter : " + i + ".xhtml created!");
    });

    //create file Toc //(parseInt(i) + 1)
    let toc =
      "<navPoint id='num_" +
      i +
      "' playOrder='" +
      i +
      "'>\n\t<navLabel>\n\t\t<text>" +
      numChap +
      "</text>\n\t</navLabel>\n\t<content src='" +
      i +
      ".xhtml'/>\n</navPoint>\n";

    fs.appendFile(dir + "toc.txt", toc, function (err) {
      if (err) throw err;
      console.log("Toc update!");
    });
  }

  //Close browser
  await browser.close();
})();
