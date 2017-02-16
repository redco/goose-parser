(function(open) {
    XMLHttpRequest.prototype.open = function(method, url, async, user, pass) {
        this.addEventListener("readystatechange", function() {
            if (this.readyState === 4) {
                var res = {'response': this.responseText, 'url': url};
                console.log(JSON.stringify(res));
            }
        }, false);
        open.call(this, method, url, async, user, pass);
    };
})(XMLHttpRequest.prototype.open);
