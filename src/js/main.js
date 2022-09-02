const { app, BrowserWindow, ipcMain, dialog, net } = require('electron')
const path = require('path')
const fs = require('fs') // cp, copyFileSync
const initSqlJs = require('sql.js');
const util = require('util')
const childProcess = require('child_process');
const simpleGit = require('simple-git');
//simpleGit().clean(simpleGit.CleanOptions.FORCE);
//const git = simpleGit();
//const git = simpleGit(dirPath);
//git.clean(simpleGit.CleanOptions.FORCE)

//const https = require('https');
//const axios = require('axios');
const fetch = require('electron-fetch').default;
const lib = new Map()

function createWindow () {
    const mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        //transparent: true, // 透過
        //opacity: 0.3,
        //frame: false,      // フレームを非表示にする
        webPreferences: {
            nodeIntegration: false,
            //nodeIntegration: true, // https://www.electronjs.org/ja/docs/latest/breaking-changes
            enableRemoteModule: true,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    })
    mainWindow.loadFile('index.html')
    //mainWindow.setMenuBarVisibility(false);
    mainWindow.webContents.openDevTools()
}

app.whenReady().then(() => {
    createWindow()
    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit()
})

async function loadDb(filePath=`src/db/mylog.db`) {
    if (null === filePath) { filePath = `src/db/mylog.db` }
    if (!lib.has(`DB`)) {
        const SQL = await initSqlJs().catch(e=>console.error(e))
        lib.set(`SQL`, SQL)
        const db = new SQL.Database(new Uint8Array(fs.readFileSync(filePath)))
        lib.set(`DB`, db)
    }
    return lib.get(`DB`)
}
function readFile(path, kwargs) { return fs.readFileSync(path, kwargs) }

// ここではdb.execを参照できるが、return後では参照できない謎
ipcMain.handle('loadDb', async(event, filePath=null) => {
    console.log('----- loadDb ----- ', filePath)
    return loadDb(filePath)
})
// db.execの実行結果を返すならOK
ipcMain.handle('get', async(event) => {
    console.log('----- get ----- ')
    if (!lib.has(`SQL`)) {
        loadDb()
    }
    const res = lib.get(`DB`).exec(`select * from comments order by created desc;`)
    console.log(res)
    return res[0].values
})
ipcMain.handle('insert', async(event, r)=>{
    if (!lib.has(`SQL`)) {loadDb()}
    console.debug(r)
    lib.get(`DB`).exec(`insert into comments(content, created) values('${r.content}', ${r.created});`)
    const res = lib.get(`DB`).exec(`select * from comments where created = ${r.created};`)
    return res[0].values[0]
})
ipcMain.handle('clear', async(event)=>{
    lib.get(`DB`).exec(`delete from comments;`)
})
ipcMain.handle('delete', async(event, ids)=>{
    lib.get(`DB`).exec(`begin;`)
    for (const id of ids) {
        lib.get(`DB`).exec(`delete from comments where id = ${id};`)
    }
    lib.get(`DB`).exec(`commit;`)
})
ipcMain.handle('exportDb', async(event)=>{
    return lib.get(`DB`).export()
})

ipcMain.handle('basename', (event, path)=>{ return path.basename(path) })
ipcMain.handle('dirname', (event, path)=>{ return path.dirname(path) })
ipcMain.handle('extname', (event, path)=>{ return path.extname(path) })
ipcMain.handle('pathSep', (event, path)=>{ return path.sep })

ipcMain.handle('exists', (event, path)=>{ return fs.existsSync(path) })
ipcMain.handle('isFile', (event, path)=>{ return fs.lstatSync(path).isFile() })
ipcMain.handle('isDir', (event, path)=>{ return fs.lstatSync(path).isDirectory() })
ipcMain.handle('isLink', (event, path)=>{ return fs.lstatSync(path).isSymbolicLink() })
ipcMain.handle('isBlockDev', (event, path)=>{ return fs.lstatSync(path).isBlockDevice() })
ipcMain.handle('isCharDev', (event, path)=>{ return fs.lstatSync(path).isCharacterDevice() })
ipcMain.handle('isFifo', (event, path)=>{ return fs.lstatSync(path).isFIFO() })
ipcMain.handle('isSocket', (event, path)=>{ return fs.lstatSync(path).isSocket() })
ipcMain.handle('mkdir', (event, path)=>{
    if (!fs.existsSync(path)) {
        fs.mkdirSync(path, {recursive:true})
    }
})
ipcMain.handle('cp', async(event, src, dst, options) => { // Node.js v16.7.0〜 https://nodejs.org/api/fs.html#fscpsrc-dest-options-callback
    fs.cp(src, dst, options, ()=>{})
})
ipcMain.handle('readFile', (event, path, kwargs)=>{ return readFile(path, kwargs) })
ipcMain.handle('readTextFile', (event, path, encoding='utf8')=>{ return readFile(path, { encoding: encoding }) })
ipcMain.handle('writeFile', (event, path, data)=>{ return fs.writeFileSync(path, data) })
ipcMain.handle('shell', async(event, command) => {
    const exec = util.promisify(childProcess.exec);
    return await exec(command);
    //let result = await exec(command);
    //document.getElementById('result').value = result.stdout;
})
ipcMain.handle('gitInit', async(event, username, token, dirPath, repo, remote)=>{// remote='origin'
    console.log(`----- gitInit -----`)
    const git = simpleGit(`${dirPath}/${repo}`);
    git.clean(simpleGit.CleanOptions.FORCE)
    await git.init()
    await git.addRemote(remote, `https://${username}:${token}@github.com/${username}/${repo}.git`)
})
ipcMain.handle('gitPush', async(event, username, email, dirPath, repo, remote, branch, message)=>{
    console.log(`----- gitPush -----`)
    simpleGit(`${dirPath}/${repo}`)
        .addConfig('user.name', username)
        .addConfig('user.email', email)
        .add('.')
        //.add('./*') // assetディレクトリ自体アップされず
        //.add('**/*') // asset/blank.mdのみ
        .commit(message)
        .push(remote, branch);// remote='origin', branch='master'
})
ipcMain.handle('fetch', async(event, url, options)=>{
    console.log('----- fetch -----')
    console.log(url)
    console.log(options)
    const res = await fetch(url, options).catch(e=>console.error(e));
    console.log(res)
    const json = await res.json()
    console.log(json)
    return json
})

