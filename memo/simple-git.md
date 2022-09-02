# simple-gitを試す

　Node.jsのパッケージ[simple-git][]を使ってgitコマンドを呼び出す。

[simple-git]:https://www.npmjs.com/package/simple-git
[simple-git README]:https://github.com/steveukx/git-js

<!-- more -->

# ブツ

* [リポジトリ][]

[リポジトリ]:https://github.com/ytyaru/Electron.simple.git.20220902105438

## インストール＆実行

```sh
NAME='Electron.simple.git.20220902105438'
git clone https://github.com/ytyaru/$NAME
cd $NAME
npm install
npm start
```

### 準備

1. [GitHubアカウントを作成する](https://github.com/join)
1. `repo`スコープ権限をもった[アクセストークンを作成する](https://github.com/settings/tokens)
1. [インストール＆実行](#install_run)してアプリ終了する
	1. `db/setting.json`ファイルが自動作成される
1. `db/setting.json`に以下をセットしファイル保存する
	1. `username`:任意のGitHubユーザ名
	1. `email`:任意のGitHubメールアドレス
	1. `token`:`repo`スコープ権限を持ったトークン
	1. `repo`:任意リポジトリ名（`mytestrepo`等）
	1. `address`:任意モナコイン用アドレス（`MEHCqJbgiNERCH3bRAtNSSD9uxPViEX1nu`等）
1. `dst/mytestrepo/.git`が存在しないことを確認する（あれば`dst`ごと削除する）
1. GitHub上に同名リモートリポジトリが存在しないことを確認する（あれば削除する）

### 実行

1. `npm start`で起動またはアプリで<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>R</kbd>キーを押す（リロードする）
1. `git init`コマンドが実行される
	* `repo/リポジトリ名`ディレクトリが作成され、その配下に`.git`ディレクトリが作成される
1. [createRepo][]実行後、リモートリポジトリが作成される
    * なぜか`asset/`ディレクトリとその配下のファイル一式がアップロードされない……
    * ローカルリポジトリのほうにはちゃんと存在する

　リモートリポジトリをみると、なぜか投げモナコイン用画像がある`asset/`ディレクトリがアップロードされない。

　色々試しているうちに、なぜかもう一度`git push`するとアップロードされることを発見した。そこでアプリ起動時にいつも`git push`するよう実装した。ようするに2回目の起動で`asset/`ディレクトリがアップされる。

　初回の`git push`で`asset/`がアップされない原因は不明。一回に`push`できるファイル数には限りがあるなど、隠れた制約があるのかな？

1. アプリで<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>R</kbd>キーを押す（リロードする）
    * もう一度`git push`される
1. `asset/`ディレクトリとその配下のファイル一式がアップロードされる

### GitHub Pages デプロイ

　アップロードされたファイルからサイトを作成する。

1. アップロードしたユーザのリポジトリページにアクセスする（`https://github.com/ユーザ名/リポジトリ名`）
1. 設定ページにアクセスする（`https://github.com/ユーザ名/リポジトリ名/settings`）
1. `Pages`ページにアクセスする（`https://github.com/ユーザ名/リポジトリ名/settings/pages`）
    1. `Source`のコンボボックスが`Deploy from a branch`になっていることを確認する
    1. `Branch`を`master`にし、ディレクトリを`/(root)`にし、<kbd>Save</kbd>ボタンを押す
    1. <kbd>F5</kbd>キーでリロードし、そのページに`https://ytyaru.github.io/リポジトリ名/`のリンクが表示されるまでくりかえす（***数分かかる***）
    1. `https://ytyaru.github.io/リポジトリ名/`のリンクを参照する（デプロイ完了してないと404エラー）

# 経緯

　[][]のとき、なぜか一部ファイル、モナコイン用画像ファイルが`push`されなかった。原因不明。別の方法で`push`できないかと思いググってみたところ[simple-git][]を見つけたので試してみることにした。

[]:
[Node.js で Git 操作。simple-git を使ってみた]:https://neos21.net/blog/2020/07/24-01.html

　ただし[simple-git][]はシステムにインストールされた`git`コマンドをNode.jsの標準API`child_process.spawn()`で実行するラッパーらしい。それは私が実装している以下のコードと大差ないのでは？　とも思う。けれど他に対案もないので藁にもすがる思いで試すことにした。

```javascript
const util = require('util')
const childProcess = require('child_process');
ipcMain.handle('shell', async(event, command) => {
    const exec = util.promisify(childProcess.exec);
    return await exec(command);
    //let result = await exec(command);
    //document.getElementById('result').value = result.stdout;
})
```

# コード抜粋

## main.js

```javascript
const simpleGit = require('simple-git');

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
        //.add('./*') // assetディレクトリ自体アップされず
        //.add('**/*') // asset/blank.mdファイルを追加するとそれだけアップされた
        .add('.') // assetディレクトリ自体アップされず（二回目のpushでアップされることを発見）
        .commit(message)
        .push(remote, branch);// remote='origin', branch='master'
})
```

　全ファイルをアップロードするとき、`git.add()`の引数を少し変えてみたりした。コマンドだと`git add .`がそれに該当するので、同じようにしてみた。[simple-git README][]では`./*`のような引数しか書いてなかった。

## preload.js

```javascript
    gitInit:async(username, token, dirPath, repo, remote)=>await ipcRenderer.invoke('gitInit', username, token, dirPath, repo, remote),
    gitPush:async(username, email, dirPath, repo, remote, branch, message)=>await ipcRenderer.invoke('gitPush', username, email, dirPath, repo, remote, branch, message),
```

## renderer.js

```javascript
const exists = await git.init(document.getElementById('github-repo').value)
if (!exists) { // .gitがないなら
    const res = await hub.createRepo({
        'name': `${setting.github.repo}`,
        'description': 'リポジトリの説明',
    }, setting)
    await maker.make()
    await git.push('新規作成')
} else {
    await git.push()
}
```

## git.js

```javascript
class Git {
    async init() {
        const exists = await window.myApi.exists(`${this.dir}/${this.repo}/.git`)
        if(!exists) {
            await window.myApi.mkdir(`${this.dir}/${this.repo}`)
            let res = await window.myApi.gitInit(this.username, this.token, this.dir, this.repo, this.remote)
        } else {
            console.log(`${this.dir}/${this.repo}/.git は既存のためgit initしません。`)
        }
        return exists
    }
    async push(message=null) {
        if (!message) { message = `追記:${new Date().toISOString()}` }
        let res = await window.myApi.gitPush(this.username, this.email, this.dir, this.repo, this.remote, this.branch, message)
    }
```

