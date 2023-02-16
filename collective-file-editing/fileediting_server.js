const {createServer} = require("http")
const {createWriteStream, createReadStream} = require("fs");
const methods = Object.create(null);

createServer((request, response) => {
  let handler = methods[request.method] || "other";
  handler(request)
  .catch(error => {
    if (error.status != null) return error;
    return {body: String(error), status: 500};
  })
  .then(({body, status = 200, type = "text/plain"}) => {
      response.writeHead(status, {"Content-Type": type});
      if (body && body.pipe) {
      body.pipe(response)
      } else response.end(body);
  });
}).listen(8000);

async function notAllowed(request) {
  return {
    status: 405,
    body: `Method ${request.method} not allowed.`
  };
}

var {parse} = require("url");
var {resolve, sep} = require("path");

var baseDirectory = process.cwd();

function urlPath(url) {
  let {pathname} = parse(url);
  let path = resolve(decodeURIComponent(pathname).slice(1));
  if (path != baseDirectory &&
      !path.startsWith(baseDirectory + sep)) {
    throw {status: 403, body: "Forbidden"};
  }
  return path;
}

const {readFile, readFileSync, readdirSync} = require("fs");
const {stat, readdir} = require("fs").promises;
const mime = require("mime");

methods.GET = async function(request) {
  let path = urlPath(request.url);
  let stats;
  try {
    stats = await stat(path);
  } catch (error) {
    if (error.code != "ENOENT") throw error;
    else return {status: 404, body: "File not found"};
  }
  if (stats.isDirectory()) {
    return {body: JSON.stringify(await readdir(path))};
  } else {
    return {body: createReadStream(path),
            type: mime.getType(path)};
  }
};

const {rmdir, unlink} = require("fs").promises;

methods.DELETE = async function(request) {
  let path = urlPath(request.url);
  let stats;
  try {
    stats = await stat(path);
  } catch (error) {
    if (error.code != "ENOENT") throw error;
    else return {status: 204};
  }
  if (stats.isDirectory()) await rmdir(path);
  else await unlink(path);
  return {status: 204};
};

function pipeStream(from, to) {
  return new Promise((resolve, reject) => {
    from.on("error", reject);
    to.on("error", reject);
    to.on("finish", resolve);
    from.pipe(to);
  });
}

methods.PUT = async function(request) {
  let path = urlPath(request.url);
  await pipeStream(request, createWriteStream(path));
  return {status: 204};
};

const {mkdir} = require("fs").promises

methods.MKCOL = async function(request) {
  let path = urlPath(request.url)
  let stats;
  try {
    stats = await stat(path)
  } catch (error) {
    if (error.code != "ENOENT") throw error;
    else await mkdir(path)
    return {status:204}
  }
  if (stats.isDirectory()) return {status: 240}
  else return {status: 400, body: `Not a directory`}
}