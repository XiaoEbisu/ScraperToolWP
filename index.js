const puppeteer = require("puppeteer");
const fs = require("fs");
const download = require("image-downloader");
const Constants = require("./cst");

const createDir = (dirName) => {
  fs.mkdir(dirName, (err) => {
    if (err) {
      throw err;
    }
    console.log(" is creating ...\n");
  });
};

const createFile = (directory, nameFile, content) => {
  let isNewFile = !fs.existsSync(directory + nameFile);

  fs.appendFile(directory + nameFile, content, function (err) {
    if (err) throw err;
    if (isNewFile) {
      console.log("\x1b[34m", nameFile + " has been created!");
    } else {
      console.log("\x1b[32m", nameFile + " has been updated!");
    }
  });
};

/*---------------------------------------------------*/
/*------------------ MAIN FUNCTION ------------------*/
/*---------------------------------------------------*/

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

  //Directory path
  const dir = "./" + NameBook + "/";

  //Create new directory
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
  createFile(dir, "#cover.xhtml", coverContent);

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

    //check if wordpress
    if (!url.includes("wordpress.com")) {
      continue;
    }

    //Go in ChapterUrl
    await page.goto(url);

    //Take Chapter Number Title in Header
    let numChap = await page.evaluate((el) => {
      return el.textContent;
    }, (await page.$x(Constants.NUMCHAP))[0]);

    //Take Chapter Content
    let listofp = await page.$x(Constants.CONTENT);

    /*Make a String var to hold "Chapter Content"*/
    let content =
      "<?xml version='1.0' encoding='utf-8'?><html xmlns='http://www.w3.org/1999/xhtml'><head><title>" +
      numChap +
      "</title><link href='stylesheet.css' rel='stylesheet' type='text/css'/>" +
      "</head><body>" +
      "<h1>" +
      numChap +
      "</h1>";

    for (var j = 0; j < listofp.length; j++) {
      let myp = await page.evaluate((el) => el.outerHTML, listofp[j]);
      content += myp;
    }
    content = content + "</body></html>";
    createFile(dir, i + ".xhtml", content);

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
    createFile(dir, "toc.txt", toc);
  }

  //Close browser
  await browser.close();
})();
