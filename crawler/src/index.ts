import * as express from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';

const app = express();

app.use(express.urlencoded({ extended: false }));
app.use(express.static(`${__dirname}/client`));

const checkURL = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const parsed = new URL(req.body.url);
  const hostnameFragments = parsed.hostname.split('.');

  // Just the common ones to start with.
  const ignoredMIME = ['css', 'js', 'jpg', 'jpeg', 'png', 'bmp', 'avi', 'mp4',' mp3', 'wav', 'webm', 'webp'];
  const pathnameFragments = parsed.pathname.split('.');

  if (hostnameFragments[hostnameFragments.length -1 ] !== 'mk') {
    return res.status(400).send(`Non-mk domain received: ${req.body.url}.`);
  };

  if (ignoredMIME.includes(pathnameFragments[pathnameFragments.length - 1])) {
    return res.status(400).send(`Non-crawlable extension detected: ${pathnameFragments[pathnameFragments.length - 1]}`);
  }

  next();
};

app.post('/crawl', checkURL, async (req, res) => {
  try {
    const page = await axios(req.body.url);
    const $ = cheerio.load(page.data);
    const links = $('a').length;
    res.send(`The page ${req.body.url} is ${page.data.length / 1000} kilobytes big, and contains ${links} links.`);
  } catch(err) {
    res.status(400).send(`Request for <u>${req.body.url}</u> failed. Reason: <pre>${err.message}</pre>`);
  }
});

app.get('/', express.static(`${__dirname}/client`));

const port = 3000;
console.log('Crawler is online:', `http://localhost:${port}`);
app.listen(port);
