// TODO: add cheerio in order to automatically get text content of the page

const DATA_FILE_NAME = 'example-data-file.txt';
const VIDEO_DIR_NAME = 'example-video-dir';

const fs = require('fs');
const path = require('path');
const ytdl = require('ytdl-core');
const request = require('request');
const textFilePath = path.join(__dirname, DATA_FILE_NAME);
const videoDirPath = path.join(__dirname, VIDEO_DIR_NAME);
let dataString = '';
let studentNamesArr = [];
let videoLinksArr = [];

if (!fs.existsSync(videoDirPath)) fs.mkdirSync(videoDirPath); // TODO: make it async

async function wrapper() {
  async function readFile() {
    try {
      dataString = await fs.promises.readFile(textFilePath);
      console.log('The data text file successfully read!');
    } catch (error) {
      console.error('Error while reading input file:', error.message);
    }
  }

  function extractNicknames() {
    const regex = /data-row-key="([\w\d-]+)"/g;
    let match;
    while (match = regex.exec(dataString)) {
      studentNamesArr.push(match[1]);
    }
    return studentNamesArr;
  }

  function getPageContent(nickname) {
    const url = `https://rolling-scopes-school.github.io/${nickname}-JSFE2023Q1/self-introduction/`;
    return new Promise((resolve, reject) => {
      request(url, (error, response, html) => {
        if (error) {
          reject(error);
          return;
        }
        const pageContent = html;
        resolve(pageContent);
      });
    });
  }


  await readFile();
  const nicknamesArr = extractNicknames();
  console.log('Nicknames array generated... Length:', nicknamesArr.length, nicknamesArr);


  for (let i = 0; i < nicknamesArr.length; i += 1) {
    const nickname = nicknamesArr[i];

    const pageContent = await getPageContent(nickname);
    const regEx1 = new RegExp(/https:\/\/youtu\.be\/([^\</>/\s]+)/, "g");
    const regEx2 = new RegExp(/https:\/\/www.youtube.com\/([^\"/<]+)/, "g");
    const regEx3 = new RegExp(/https:\/\/www.youtube.com\/([^\<]+)/, "g");
    const regEx4 = new RegExp(/https:\/\/youtu\.be\/([^\"]+)/, "g");
    const notFoundRegEx = new RegExp(/\<p>\<strong>File not found<\/strong>\<\/p>/);

    let match = pageContent.match(regEx1) || pageContent.match(regEx2);

    if (match === null || match.length > 300) {
      match = pageContent.match(regEx3) || pageContent.match(regEx4);
      if (pageContent.match(notFoundRegEx)) {
        console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> File not found! Skipping this student...');
        continue;
      } else {
        console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> No video link in the file! Skipping this student...');
      }
    }

    if (match === null || match.length > 300) {
      match = pageContent.match(regEx4)
    }


    let link;
    try {
      link = match[0];
    } catch (error) {
      console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>Trying to generate video link for student', nickname, error.message);
      continue
    }

    videoLinksArr.push(link);
    console.log(`Parsing student ${i}... Student nickname: ${nickname}, YT video link: ${link}`);

    function checkIfExist(nickname) { // TODO: get rid of existsSync
      const directory = videoDirPath;
      const filename = `${nickname}.mp4`;
      return fs.existsSync(path.join(directory, filename));
    }

    const isAlreadyExist = checkIfExist(nickname);
    if (isAlreadyExist) {
      console.log(`Video of ${nickname} has already been downloaded, skipping`);
      continue;
    } else {
      console.log(`Downloading ${nickname}'s video...`);
    }


    await new Promise((resolve, reject) => {
      const writeableStream = fs.createWriteStream(path.join(videoDirPath, `${nickname}.mp4`));
      writeableStream.on('finish', () => {
        console.log(`${nickname}'s video downloaded successfully`);
        resolve();
      });
      ytdl(link, {format: "mp4"}).pipe(writeableStream);
    })

  }
}
wrapper();
