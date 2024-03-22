// ==UserScript==
// @name         Download character.ai chat
// @namespace    https://github.com/wiger3/downloadchat/
// @version      2.3
// @author       wiger3
// @description  Downloads the current character.ai chat as a text file. Right click on page to use. Only works for old.character.ai/chat2
// @match        https://old.character.ai/chat2*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=character.ai
// @run-at context-menu
// ==/UserScript==

/* Changelog
    2.0 - First version, the chat gets printed into the browser console
    2.1 - Replaced the console logging with actual downloading. The chat will now download as "<character name> <date>.txt"
    2.2 - Fixed an issue with downloading longer chats
    2.3 - Added a dialog to select how to format the downloaded file. First public release
*/

(async ()=>{
    var token = JSON.parse(localStorage['char_token']).value;

    var _cache; // avoid double request
    async function _fetchchats(charid) {
        if(!_cache) {
            let url = 'https://neo.character.ai/chats/recent/' + charid;

            let response = await fetch(url, {
                headers: { "Authorization": `Token ${token}` }
            });
            let json = await response.json();
            _cache = json['chats'];
        }
        return _cache;
    }
    async function getChats(charid) {
        let json = await _fetchchats(charid);
        let chats = [];
        for(let x of json) chats.push(x.chat_id);
        return chats;
    }
    async function getMessages(charid, chat, format) {
        let url = 'https://neo.character.ai/turns/' + chat + '/';
        let next_token = null;

        let turns = [];
        do {
            let url2 = url;
            if(next_token != null)
                url2 += "?next_token=" + encodeURIComponent(next_token);
            let response = await fetch(url2, {
                headers: { "Authorization": `Token ${token}` }
            });
            let json = await response.json();

            for(let turn of json['turns']) {
                let o = {};
                if(format == "definition")
                    o.author = turn.author.is_human ? "{{user}}" : "{{char}}";
                else if(format == "names")
                    o.author = turn.author.name;
                o.message = turn.candidates.find(x => x.candidate_id === turn.primary_candidate_id).raw_content;
                turns.push(o);
            }
            next_token = json['meta']['next_token'];
        } while(next_token != null);
        return turns.reverse();
    }
    async function getCharacterName(charid) {
        let json = await _fetchchats(charid);
        return json[0].character_name;
    }
    async function saveChat(e) {
        let format = e.formData.get('format');
        dialog.close();
        console.log(format);
        let char = params('char');
        let history = params('hist');
        if(history === null) {
            let chats = await getChats(char);
            history = chats[0];
        }
        let msgs = await getMessages(char, history, format);
        let str = "";
        for(let msg of msgs) {
            str += `${msg.author}: ${msg.message}\n`;
        }
        let date = new Date();
        let date_str = `${date.getDate()}-${date.getMonth()+1}-${date.getFullYear()} ${date.getHours()}.${date.getMinutes()}`;
        download(`${await getCharacterName(char)} ${date_str}.txt`, str.trimEnd());
    }
    
    var dialog = open("", "caiDownloader", "popup");
    if(!dialog)
        return alert("Failed to open downloader dialog. Check browser pop-up settings?");
    dialog.resizeTo(600, 600);
    let ddocument = dialog.document;
    ddocument.body.style.backgroundColor = "white";
    ddocument.body.style.fontFamily = "sans-serif";
    let el, label;
    el = ddocument.createElement("h2");
    el.appendChild(ddocument.createTextNode("Please select downloader format"));
    ddocument.body.appendChild(el);
    let form = ddocument.createElement("form");
        el = ddocument.createElement("input"); // like definition
            el.type = "radio";
            el.name = "format";
            el.id = "definition";
            el.value = el.id;
            el.checked = true;
            form.appendChild(el);
            label = ddocument.createElement("label");
                label.htmlFor = "definition";
                label.innerHTML = "Like definition";
                el = ddocument.createElement("div");
                    el.style.paddingLeft = "2em";
                    el.style.color = "gray";
                    el.innerHTML = "{{char}}: Hello! I am the bot!<br>{{user}}: Hi. I'm the person chatting with the bot.";
                    label.appendChild(el);
            form.appendChild(label);
        el = ddocument.createElement("input"); // using names
            el.type = "radio";
            el.name = "format";
            el.id = "names";
            el.value = el.id;
            form.appendChild(el);
            label = ddocument.createElement("label");
                label.htmlFor = "names";
                label.innerHTML = "Using names";
                el = ddocument.createElement("div");
                    el.style.paddingLeft = "2em";
                    el.style.color = "gray";
                    el.innerHTML = "Chatty AI: Hello! I am the bot!<br>You: Hi. I'm the person chatting with the bot.";
                    label.appendChild(el);
            form.appendChild(label);
        el = document.createElement("button"); // submit
            el.innerHTML = "Download";
            el.style.float = "right";
            el.style.backgroundColor = "cornflowerblue";
            el.style.borderRadius = "1em";
            el.style.padding = "0.5em";
            el.style.margin = "2em";
            form.appendChild(el);
        form.onformdata = saveChat;
    ddocument.body.appendChild(form);

    function download(filename, text) {
        var element = document.createElement('a');
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
        element.setAttribute('download', filename);
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    }
    function params(parameterName) {
        var result = null,
            tmp = [];
        location.search
            .substr(1)
            .split("&")
            .forEach(function (item) {
              tmp = item.split("=");
              if (tmp[0] === parameterName) result = decodeURIComponent(tmp[1]);
            });
        return result;
    }
})();
