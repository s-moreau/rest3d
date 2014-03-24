define(['viewer'], function (viewer) {

viewer.FPSCounter = function() {
    function counter(){
        var counterID;
        var intervalID;

        // (function () {
        //     this.check = true;
        // })();

        return {
            'createElement': function (elem) {
                counterID = elem.id;
                this.fps = 0;
                this.averageFPS = 0;
                this.averageCount = 0;
            },
            'increment': function () {
                ++this.fps;
            },
            'clear': function () {
                this.fps = 0;
            },
            'UpdateFPS': function () {
                var fpsDiv = document.getElementById(counterID);
                fpsDiv.innerHTML = this.fps + " FPS";
                this.averageFPS = (this.averageFPS * this.averageCount + this.fps) / (1+this.averageCount);
                this.averageCount ++;
                this.fps = 0;
            },
            'getAverageFPS': function() {
                return this.averageFPS;
            },
            'run': function () {
                var that = this;
                intervalID = setInterval(function () { that.UpdateFPS.call(that); }, 1000);
            },
            'stop': function () {
                clearInterval(intervalID);
                this.fps = 0;
                this.UpdateFPS();
            }
        }
    }
return new counter();
};

  return viewer;
});