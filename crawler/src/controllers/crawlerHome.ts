import { Request, Response } from "express"
import * as request from 'request';
import * as cheerio from 'cheerio';

class Ping {
    private _url: string;

    constructor (url: string) { 
        this._url = url; 
    }

    requestSizePromise(): Promise<number | null> {
        return new Promise((resolve, reject) => {
            this.requestSize((err, calcSize) => {
                if (err) { return reject(err); }

                resolve(calcSize);
            })
        })
    }

    makeRequest() {
        return this.requestLinksPromise()
        .then((numLinks) => {
            return this.requestSizePromise()
            .then((calcSize) => {
                let d = {
                    calcSize: calcSize,
                    numLinks: numLinks
                }
                return d;
            })
        })
    }

    requestLinksPromise(): Promise<number | null> {
        return new Promise((resolve, reject) => {
            this.requestLinks((err, numLinks) => {
                if (err) { return reject(err) }

                return resolve(numLinks);
            })
        })
    }

    

    requestLinks(callback: (err: Error | null, numLinks: number | null) => void): void {
        let countedLinks: number = 0;

        request(this._url, (error, response, html) => {
            if (error) return callback(error, null);
            if (response.statusCode !== 200) {
                return callback(new Error('Response is not 200'), null);
            }
            const sourceCodeDump = cheerio.load(html);
            sourceCodeDump("a").each(() => { countedLinks++; });
            callback(null, countedLinks);   
        });
    }

    requestSize(callback: (err: Error | null , calculatedSize: number | null) => void): void {
        request(this._url, (error, response, _html) => {
            if (error) {
                return callback(error, null);
            }
            let contLength = response.headers["content-length"];
            if (!contLength) {
                callback(null, 0);
            } else {
                let contLengthKBS = Number.parseInt(contLength, 10) / 1000;
                callback(null, contLengthKBS);
            }
        });

    }
}

// GET /
// Home page of the crawler
export let index = (req: Request, res: Response) => {
    res.render("home", {
        title: "Home"
    });
};

// POST /url
// Route for sending an URL
export let postURL = (req: Request, res: Response) => {
    req.assert("url", "URL cannot be blank!").notEmpty();

    let errors = req.validationErrors();
    if (errors) {
        req.flash("errors", errors);
        return res.redirect("/");
    }
    
    // TODO: Check if it is a valid URL
    // FAIL if not.
    let url: string = req.body.url;

    let ping = new Ping(url);

    ping.makeRequest()
    .then((d) => {
        res.render("home", { size: d.calcSize, links: d.numLinks });
    })
    .catch((err) => { res.status(500).end("Something bad happened.") });

    // ping.requestSize((e, responseSize) => {
    //     if (e) return res.status(500).end('something bad happened');
    //     let websiteSize = responseSize;
    //     if (websiteSize) { websiteSize = websiteSize / 1000 };

    //     ping.requestLinks((err, numLinks) => {
    //         if (err) return res.status(500).end('something even worse happened');
    //         // It renders home, but stays at /url
    //         // It should redirect to / and render home
    //         // with the results
    //         res.render("home", { size: websiteSize, links: numLinks });
    //     })
    // });
}
