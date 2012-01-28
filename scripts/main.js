var AudioHelper = {
    audio : null,
    delay : null,
    callback : null,
    fadeOut         : function (audio, delay, volume, callback) {
                        window.setTimeout(function() {this.fadeOutHelper(audio, volume, callback, delay)}.bind(this), delay);
                      },
    fadeOutHelper : function (audio, volume, callback, delay) {
                        if (volume == undefined) {
                            volume = 0;
                        }
                        if (audio.volume - 0.01 > volume) {
                            audio.volume -= 0.01;
                            window.setTimeout(function() {this.fadeOutHelper(audio, volume, callback, delay)}.bind(this), delay);
                        } else {
                            audio.volume = volume;
                            if (callback != undefined) {
                                callback();
                            }
                        }
                        },
    fadeInHelper    : function (audio, volume, callback, delay) {
                        if (volume == undefined) {
                            volume = 1;
                        }

                        if (audio.volume + 0.01 < volume) {
                            audio.volume += 0.01;
                            window.setTimeout(function() {this.fadeInHelper(audio, 1, callback, delay)}.bind(this), delay);
                        } else {
                            audio.volume = volume;

                            if (callback != undefined) {
                                callback();
                            }

                        }
                      },
        loadedDataEvent : function () {
                        if (this.audio != null) {
                            this.audio.play();
                            window.setTimeout(function() {this.fadeInHelper(this.audio, 1, this.callback, this.delay)}.bind(this), this.delay);
                        }
                    },
        fadeIn : function (audio, delay, src, volume, callback) {
            this.delay = delay;
            this.callback = callback;
            this.audio = audio;
            this.audio.volume = 0;
            this.audio.src = src;
            this.audio.load();

        },
        fadeInWithoutNewFile : function (audio, delay, callback) {
            window.setTimeout(function() {this.fadeInHelper(audio, 1, callback, delay)}.bind(this), delay);
        }
}
var scene = {

    nodes : new Array(),
    currentNode : null,
    backgroundSoundChannelOne: null,
    backgroundSoundChannelTwo: null,
    foregroundQueue: null,
    activeChannel: 2,
    foregroundSound: null,

    add : function (xmlNode) {
        this.nodes[$(xmlNode).attr('id')] = new node(xmlNode);
    },
    enterNode : function (nodeId) {
        this.nodes[nodeId].enterNode();
        this.currentNode = this.nodes[nodeId];
    },
    initialize : function () {
        this.setupControls();
        this.setupSound();
    },
    setupSound : function () {
        this.backgroundSoundChannelOne = new Audio();
        this.backgroundSoundChannelOne.addEventListener('ended', function () {this.currentTime = 0;this.play();});
        this.backgroundSoundChannelOne.addEventListener('loadeddata', AudioHelper.loadedDataEvent.bind(AudioHelper));
        this.backgroundSoundChannelTwo = new Audio();
        this.backgroundSoundChannelTwo.addEventListener('ended', function () {this.currentTime = 0;this.play();});
        this.backgroundSoundChannelTwo.addEventListener('loadeddata', AudioHelper.loadedDataEvent.bind(AudioHelper));
        this.foregroundSound = new Audio();
        this.foregroundQueue = new foregroundQueue();
        this.foregroundSound.addEventListener('ended', this.foregroundQueue.afterPlay.bind(this.foregroundQueue));
    },
    setupControls : function () {
        document.addEventListener('keyup', function (event) {
            var key = null;
            switch (event.keyCode) {
                case 87: key = 'W'; break;
                case 83: key = 'S'; break;
                case 65: key = 'A'; break;
                case 68: key = 'D'; break;
                case 84: key = 'T'; break;
                case 89: key = 'Y'; break;
                case 78: key = 'N'; break;
                case 85: key = 'U'; break;
            }
            if (key != null) {
                this.currentNode.handleKey(key);
            }
        }.bind(this));

    }
}


function foregroundQueue () {
    this.queue = new Array();
    this.sound = null;
    this.bgChannel = null;

    this.afterFadeOut = function () {
        scene.foregroundSound.play();

    }
    this.afterFadeIn = function () {
        if (typeof(this.sound.callback) == "function") {
            this.sound.callback();
        }
        this.sound = null;
    }

    this.afterPlay = function () {
        AudioHelper.fadeInWithoutNewFile(this.bgChannel, 5, this.afterFadeIn.bind(this));
    }
    this.process = function () {
        if ((this.sound == null) && (this.queue.length > 0)) {
            this.sound = this.queue.pop();
            scene.foregroundSound.src = this.sound.sound;
            scene.foregroundSound.load();
            this.bgChannel = (scene.activeChannel == 1)?scene.backgroundSoundChannelOne:scene.backgroundSoundChannelTwo;
            AudioHelper.fadeOut(this.bgChannel, 5, 0.2, this.afterFadeOut.bind(this));
        }
        window.setTimeout(function () {this.process()}.bind(this), 10);
    }

    this.add = function (sound, callback) {
        this.queue.push (new queueItem(sound, callback));
    }

    window.setTimeout(function () {this.process()}.bind(this), 10);
}

function queueItem (sound, callback) {
    this.sound = sound;
    this.callback = callback;

}
function getSoundExtension(name) {
    return name + ".ogg";
}

function node (xmlNode) {
    this.transitions = new Array();
    this.bgSound = $(xmlNode).attr('bg');
    this.voiceSound = $(xmlNode).attr('fg');
    this.endNode = false;
    this.lastErrorSound = null;

    this.id = $(xmlNode).attr('id');

    $(xmlNode).find('transition').each(function (index, value) {this.transitions.push(new transition(value))}.bind(this));

    this.voiceCallback = function () {
                            if ((this.voiceSound != undefined) && (this.voiceSound != '')) {
                                window.setTimeout(function() {this.playVoice()}.bind(this), 100);
                            }};
    this.enterNode = function () {
        if (this.endNode == true) {
            $('#content').html('<img src="images/bg_end.jpg">');
        }

        if ((scene.currentNode == null) || (scene.currentNode.getBgSound() != this.getBgSound())) {
            if (scene.activeChannel == 1) {
                if (!scene.backgroundSoundChannelOne.paused) {
                    AudioHelper.fadeOut(scene.backgroundSoundChannelOne, 5);
                }
                AudioHelper.fadeIn(scene.backgroundSoundChannelTwo, 5, this.getBgSound(), 1, this.voiceCallback.bind(this));
                scene.activeChannel = 2;
            } else {
                if (!scene.backgroundSoundChannelTwo.paused) {
                    AudioHelper.fadeOut(scene.backgroundSoundChannelTwo, 5);
                }
                AudioHelper.fadeIn(scene.backgroundSoundChannelOne, 5, this.getBgSound(), 1, this.voiceCallback.bind(this));
                scene.activeChannel = 1;
            }
        } else {
            this.voiceCallback();
        }
    }


    this.playVoice = function () {
        if (this.voiceSound != '') {
            scene.foregroundQueue.add(this.getFgSound());
        }
    }

    this.getBgSound = function () {
        return 'sounds/bg_' + getSoundExtension(this.bgSound);
    }
    this.getFgSound = function () {
        return 'sounds/' + getSoundExtension(this.voiceSound);
    }
    this.handleKey = function (key) {
        var notfound = true;
        for (var i = 0; i < this.transitions.length; i++) {
            if (this.transitions[i].keys.indexOf(key) >= 0) {
                notfound = false;
                this.transitions[i].take();
            }
        }
        if (notfound == true) {
            var errorSounds = new Array();
            errorSounds['WASD'] = new Array();
            errorSounds['T'] = new Array();
            errorSounds['U'] = new Array();
            errorSounds['Y'] = new Array();
            errorSounds['N'] = new Array();

            errorSounds['WASD'].push ( 'sounds/' + getSoundExtension('error_w_1'));
            errorSounds['WASD'].push ( 'sounds/' + getSoundExtension('error_w_2'));
            errorSounds['WASD'].push ( 'sounds/' + getSoundExtension('error_w_3'));
            errorSounds['WASD'].push ( 'sounds/' + getSoundExtension('error_w_4'));
            errorSounds['Y'].push ( 'sounds/' + getSoundExtension('error_y'));
            errorSounds['N'].push ( 'sounds/' + getSoundExtension('error_n'));
            errorSounds['T'].push ( 'sounds/' + getSoundExtension('error_t_1'));
            errorSounds['T'].push ( 'sounds/' + getSoundExtension('error_t_2'));
            errorSounds['T'].push ( 'sounds/' + getSoundExtension('error_t_3'));
            errorSounds['T'].push ( 'sounds/' + getSoundExtension('error_t_4'));
            errorSounds['U'].push ( 'sounds/' + getSoundExtension('error_u_1'));
            errorSounds['U'].push ( 'sounds/' + getSoundExtension('error_u_2'));
            errorSounds['U'].push ( 'sounds/' + getSoundExtension('error_u_3'));
            errorSounds['U'].push ( 'sounds/' + getSoundExtension('error_u_4'));
            do {
                var queryKey = key;
                if ((key == 'W') || (key == 'A') || (key == 'S') || (key == 'D')) {
                    queryKey = 'WASD';
                }
                var index = Math.round(Math.random() * (errorSounds[queryKey].length - 1));
                var errorSound = errorSounds[queryKey][index];
            } while ((errorSounds[queryKey].length > 1) && (errorSound == this.lastErrorSound))
            this.lastErrorSound = errorSound;
            scene.foregroundQueue.add(errorSound);
        }

    }
}

function transition(xmlNode) {
    this.keys = $(xmlNode).attr('keys').split(';');
    this.dest = $(xmlNode).attr('dest');
    this.sfx = $(xmlNode).attr('fg');
    this.take = function () {
                        if (this.sfx != '') {
                            scene.foregroundQueue.add(this.getFgSound(), function () {scene.enterNode(this.dest)}.bind(this));
                        } else {
                            scene.enterNode(this.dest);
                        }
                    }
    this.getFgSound = function () {
        return 'sounds/' + getSoundExtension(this.sfx);
    }
}

function sceneParser(xmlstring) {
    $(xmlstring).find('node').each(function(index, value) {scene.add(value)});
    scene.nodes['n52'].endNode = true;
    scene.enterNode('n39');
}



$(document).ready(function() {
    scene.initialize();

    sceneParser(
        '<graph>' +
        '  <node id="n0" fg="n_center" bg="street">' +
        '    <transition dest="n1" keys="S" fg="e_bar_0"/>' +
        '    <transition dest="n14" keys="D" fg="e_train_0"/>' +
        '    <transition dest="n34" keys="W" fg="e_hera_0"/>' +
        '    <transition dest="n25" keys="A" fg="e_house_0"/>' +
        '  </node>' +
        '  <node id="n1" fg="n_bar_0" bg="bar">' +
        '    <transition dest="n4" keys="D" fg="e_bar_12"/>' +
        '    <transition dest="n2" keys="T" fg="e_bar_1"/>' +
        '    <transition dest="n3" keys="W" fg="e_bar_7"/>' +
        '  </node>' +
        '  <node id="n2" fg="n_bar_1" bg="bar">' +
        '    <transition dest="n12" keys="T" fg="e_bar_2"/>' +
        '    <transition dest="n11" keys="U" fg="e_bar_3"/>' +
        '  </node>' +
        '  <node id="n3" fg="n_bar_5" bg="bar">' +
        '    <transition dest="n3" keys="T" fg="e_bar_8"/>' +
        '    <transition dest="n9" keys="U" fg="e_bar_9"/>' +
        '  </node>' +
        '  <node id="n4" fg="n_bar_8" bg="bar">' +
        '    <transition dest="n6" keys="Y" fg="e_bar_13"/>' +
        '    <transition dest="n7" keys="N" fg="e_bar_14"/>' +
        '  </node>' +
        '  <node id="n5" fg="n_timer" bg="bar">' +
        '    <transition dest="n64" keys="U;A;S;D;W;Y;N" fg=""/>' +
        '  </node>' +
        '  <node id="n6" fg="n_bar_9" bg="bar">' +
        '    <transition dest="n8" keys="T" fg="e_bar_15"/>' +
        '    <transition dest="n7" keys="U;N" fg="e_bar_16"/>' +
        '  </node>' +
        '  <node id="n7" fg="n_bar_11" bg="bar">' +
        '    <transition dest="n5" keys="W;A;S;D" fg="e_bar_17"/>' +
        '  </node>' +
        '  <node id="n8" fg="n_bar_10" bg="bar">' +
        '    <transition dest="n8" keys="T" fg=""/>' +
        '    <transition dest="n7" keys="U;N" fg="e_bar_16"/>' +
        '  </node>' +
        '  <node id="n9" fg="n_bar_6" bg="bar">' +
        '    <transition dest="n9" keys="T" fg="e_bar_10"/>' +
        '    <transition dest="n10" keys="U" fg="e_bar_11"/>' +
        '  </node>' +
        '  <node id="n10" fg="n_bar_7" bg="bar">' +
        '    <transition dest="n5" keys="W;A;S;D" fg="e_bar_17"/>' +
        '  </node>' +
        '  <node id="n11" fg="n_bar_2" bg="bar">' +
        '    <transition dest="n12" keys="T" fg="e_bar_4"/>' +
        '  </node>' +
        '  <node id="n12" fg="n_bar_3" bg="bar">' +
        '    <transition dest="n13" keys="U" fg="e_bar_5"/>' +
        '  </node>' +
        '  <node id="n13" fg="n_bar_4" bg="bar">' +
        '    <transition dest="n5" keys="W;A;S;D;T;U" fg="e_bar_6"/>' +
        '  </node>' +
        '  <node id="n14" fg="n_train_0" bg="train">' +
        '    <transition dest="n15" keys="A;S;D" fg="steps_hall"/>' +
        '    <transition dest="n18" keys="W" fg="steps_hall"/>' +
        '  </node>' +
        '  <node id="n15" fg="n_train_3" bg="train">' +
        '    <transition dest="n16" keys="W;A;S;D" fg="steps_hall"/>' +
        '  </node>' +
        '  <node id="n16" fg="n_train_4" bg="train">' +
        '    <transition dest="n17" keys="W;A;S;D" fg="steps_hall"/>' +
        '  </node>' +
        '  <node id="n17" fg="n_train_5" bg="train">' +
        '    <transition dest="n20" keys="N" fg="e_train_4"/>' +
        '    <transition dest="n21" keys="Y" fg="e_train_5"/>' +
        '    <transition dest="n24" keys="W;A;S;D" fg="steps_hall"/>' +
        '  </node>' +
        '  <node id="n18" fg="n_train_1" bg="train">' +
        '    <transition dest="n19" keys="T;Y;U" fg="e_train_1"/>' +
        '    <transition dest="n15" keys="N;W;A;S;D" fg="e_train_3"/>' +
        '  </node>' +
        '  <node id="n19" fg="n_train_2" bg="train">' +
        '    <transition dest="n14" keys="W;A;S;D;T;U;Y;N" fg="e_train_2"/>' +
        '  </node>' +
        '  <node id="n20" fg="n_train_6" bg="train">' +
        '    <transition dest="n22" keys="Y" fg="e_train_7"/>' +
        '    <transition dest="n21" keys="N" fg="e_train_6"/>' +
        '  </node>' +
        '  <node id="n21" fg="n_train_8" bg="train">' +
        '    <transition dest="n23" keys="T;Y" fg="e_train_10"/>' +
        '    <transition dest="n24" keys="W;A;S;D" fg="steps_hall"/>' +
        '  </node>' +
        '  <node id="n22" fg="n_train_7" bg="train">' +
        '    <transition dest="n21" keys="W;A;S;D;U;N;Y" fg="e_train_9"/>' +
        '    <transition dest="n22" keys="T" fg="e_train_8"/>' +
        '  </node>' +
        '  <node id="n23" fg="n_train_9" bg="train">' +
        '    <transition dest="n24" keys="W;A;S;D;Y;N;U;T" fg="e_train_11"/>' +
        '  </node>' +
        '  <node id="n24" fg="n_timer" bg="train">' +
        '    <transition dest="n64" keys="U;A;S;D;W;Y;N" fg=""/>' +
        '  </node>' +
        '  <node id="n25" fg="n_house_0" bg="house">' +
        '    <transition dest="n26" keys="A" fg="steps_wood"/>' +
        '    <transition dest="n27" keys="W" fg="steps_wood"/>' +
        '    <transition dest="n28" keys="D" fg="steps_wood"/>' +
        '    <transition dest="n33" keys="S" fg="e_house_7"/>' +
        '  </node>' +
        '  <node id="n26" fg="n_house_4" bg="house">' +
        '    <transition dest="n30" keys="U" fg="e_house_4"/>' +
        '    <transition dest="n27" keys="D" fg="steps_wood"/>' +
        '    <transition dest="n25" keys="S" fg="steps_wood"/>' +
        '  </node>' +
        '  <node id="n27" fg="n_house_2" bg="house">' +
        '    <transition dest="n29" keys="U;W" fg="e_house_2"/>' +
        '    <transition dest="n26" keys="A" fg="steps_wood"/>' +
        '    <transition dest="n28" keys="D" fg="steps_wood"/>' +
        '    <transition dest="n25" keys="S" fg="steps_wood"/>' +
        '  </node>' +
        '  <node id="n28" fg="n_house_1" bg="house">' +
        '    <transition dest="n27" keys="A" fg="steps_wood"/>' +
        '    <transition dest="n25" keys="S" fg="steps_wood"/>' +
        '    <transition dest="n28" keys="U" fg="e_house_1"/>' +
        '  </node>' +
        '  <node id="n29" fg="n_house_3" bg="house">' +
        '    <transition dest="n29" keys="U;T" fg="e_house_3"/>' +
        '    <transition dest="n25" keys="S" fg="steps_wood"/>' +
        '  </node>' +
        '  <node id="n30" fg="n_house_5" bg="house">' +
        '    <transition dest="n31" keys="U" fg="e_house_5"/>' +
        '    <transition dest="n25" keys="S" fg="steps_wood"/>' +
        '    <transition dest="n27" keys="D" fg="steps_wood"/>' +
        '  </node>' +
        '  <node id="n31" fg="n_house_6" bg="house">' +
        '    <transition dest="n32" keys="U" fg="e_house_6"/>' +
        '    <transition dest="n25" keys="S" fg="steps_wood"/>' +
        '    <transition dest="n27" keys="D" fg="steps_wood"/>' +
        '  </node>' +
        '  <node id="n32" fg="n_house_7" bg="house">' +
        '    <transition dest="n33" keys="W;A;S;D;U" fg="steps_wood"/>' +
        '    <transition dest="n27" keys="D" fg="steps_wood"/>' +
        '  </node>' +
        '  <node id="n33" fg="n_timer" bg="house">' +
        '    <transition dest="n64" keys="U;A;S;D;W;Y;N" fg=""/>' +
        '  </node>' +
        '  <node id="n34" fg="n_hera" bg="street">' +
        '    <transition dest="n35" keys="W;U" fg="e_hera_1"/>' +
        '  </node>' +
        '  <node id="n35" fg="n_hera_0" bg="house">' +
        '    <transition dest="n41" keys="Y" fg="e_hera_2"/>' +
        '    <transition dest="n36" keys="N" fg="e_hera_5"/>' +
        '  </node>' +
        '  <node id="n36" fg="n_hera_3" bg="house">' +
        '    <transition dest="n38" keys="W;A;S;D;Y;N;T;U" fg=""/>' +
        '  </node>' +
        '  <node id="n37" fg="n_hera_4" bg="house">' +
        '    <transition dest="n38" keys="W;A;S;D;Y;N;T;U" fg=""/>' +
        '  </node>' +
        '  <node id="n38" fg="n_timer" bg="house">' +
        '    <transition dest="n64" keys="U;A;S;D;W;Y;N" fg=""/>' +
        '  </node>' +
        '  <node id="n39" fg="n_start_0" bg="start">' +
        '    <transition dest="n40" keys="W;A;S;T;U" fg="e_start_1"/>' +
        '    <transition dest="n0" keys="D" fg="e_start_0"/>' +
        '  </node>' +
        '  <node id="n40" fg="n_start_1" bg="start">' +
        '    <transition dest="n40" keys="T" fg="e_start_3"/>' +
        '    <transition dest="n0" keys="D" fg=""/>' +
        '  </node>' +
        '  <node id="n41" fg="n_hera_1" bg="house">' +
        '    <transition dest="n42" keys="N" fg="e_hera_3"/>' +
        '    <transition dest="n36" keys="Y" fg="e_hera_6"/>' +
        '  </node>' +
        '  <node id="n42" fg="n_hera_2" bg="house">' +
        '    <transition dest="n37" keys="Y" fg="e_hera_4"/>' +
        '    <transition dest="n36" keys="N" fg="e_hera_7"/>' +
        '  </node>' +
        '  <node id="n43" fg="n_end_3b" bg="end">' +
        '    <transition dest="n46" keys="N" fg=""/>' +
        '    <transition dest="n51" keys="Y" fg="e_end_4"/>' +
        '  </node>' +
        '  <node id="n44" fg="n_end_6" bg="end">' +
        '    <transition dest="n43" keys="N" fg=""/>' +
        '    <transition dest="n51" keys="Y" fg=""/>' +
        '  </node>' +
        '  <node id="n45" fg="n_end_5" bg="end">' +
        '    <transition dest="n51" keys="" fg=""/>' +
        '    <transition dest="n44" keys="N" fg=""/>' +
        '    <transition dest="n51" keys="Y" fg="e_end_4"/>' +
        '  </node>' +
        '  <node id="n46" fg="n_end_4" bg="end">' +
        '    <transition dest="n45" keys="N" fg=""/>' +
        '    <transition dest="n51" keys="Y" fg="e_end_4"/>' +
        '  </node>' +
        '  <node id="n47" fg="n_end_3" bg="end">' +
        '    <transition dest="n46" keys="N" fg=""/>' +
        '    <transition dest="n51" keys="Y" fg="e_end_4"/>' +
        '  </node>' +
        '  <node id="n48" fg="n_end_10" bg="end">' +
        '    <transition dest="n39" keys="U" fg="e_end_14"/>' +
        '  </node>' +
        '  <node id="n49" fg="n_end_9" bg="end">' +
        '    <transition dest="n48" keys="Y" fg="e_end_11"/>' +
        '    <transition dest="n48" keys="N" fg="e_end_12"/>' +
        '  </node>' +
        '  <node id="n50" fg="n_end_8" bg="end">' +
        '    <transition dest="n49" keys="A" fg="e_end_7"/>' +
        '    <transition dest="n49" keys="D" fg="e_end_9"/>' +
        '    <transition dest="n49" keys="S" fg="e_end_8"/>' +
        '    <transition dest="n49" keys="W" fg="e_end_10"/>' +
        '  </node>' +
        '  <node id="n51" fg="n_end_7" bg="end">' +
        '    <transition dest="n50" keys="Y" fg="e_end_5"/>' +
        '    <transition dest="n50" keys="N" fg="e_end_6"/>' +
        '  </node>' +
        '  <node id="n52" fg="" bg="end">' +
        '  </node>' +
        '  <node id="n53" fg="n_end_10" bg="end">' +
        '    <transition dest="n52" keys="U" fg="e_end_13"/>' +
        '  </node>' +
        '  <node id="n54" fg="n_end_3b" bg="end">' +
        '    <transition dest="n57" keys="N" fg=""/>' +
        '    <transition dest="n51" keys="Y" fg="e_end_4"/>' +
        '  </node>' +
        '  <node id="n55" fg="n_end_6" bg="end">' +
        '    <transition dest="n54" keys="N" fg=""/>' +
        '    <transition dest="n51" keys="Y" fg="e_end_4"/>' +
        '  </node>' +
        '  <node id="n56" fg="n_end_5" bg="end">' +
        '    <transition dest="n60" keys="Y" fg=""/>' +
        '    <transition dest="n55" keys="N" fg=""/>' +
        '  </node>' +
        '  <node id="n57" fg="n_end_4" bg="end">' +
        '    <transition dest="n56" keys="N" fg=""/>' +
        '    <transition dest="n51" keys="Y" fg="e_end_4"/>' +
        '  </node>' +
        '  <node id="n58" fg="n_end_9" bg="end">' +
        '    <transition dest="n53" keys="Y" fg="e_end_11"/>' +
        '    <transition dest="n48" keys="N" fg="e_end_12"/>' +
        '  </node>' +
        '  <node id="n59" fg="n_end_8" bg="end">' +
        '    <transition dest="n58" keys="A" fg="e_end_7"/>' +
        '    <transition dest="n49" keys="W" fg="e_end_10"/>' +
        '    <transition dest="n49" keys="D" fg="e_end_9"/>' +
        '    <transition dest="n49" keys="S" fg="e_end_8"/>' +
        '  </node>' +
        '  <node id="n60" fg="n_end_7" bg="end">' +
        '    <transition dest="n59" keys="N" fg="e_end_6"/>' +
        '    <transition dest="n50" keys="Y" fg="e_end_5"/>' +
        '  </node>' +
        '  <node id="n61" fg="n_end_3" bg="end">' +
        '    <transition dest="n57" keys="N" fg=""/>' +
        '    <transition dest="n51" keys="Y" fg="e_end_4"/>' +
        '  </node>' +
        '  <node id="n62" fg="n_end_2" bg="end">' +
        '    <transition dest="n61" keys="Y" fg="e_end_2"/>' +
        '    <transition dest="n47" keys="N" fg="e_end_3"/>' +
        '  </node>' +
        '  <node id="n63" fg="n_end_1" bg="street">' +
        '    <transition dest="n62" keys="W;U" fg="e_end_1"/>' +
        '  </node>' +
        '  <node id="n64" fg="n_end_0" bg="street">' +
        '    <transition dest="n63" keys="W;A;S;D" fg="e_end_0"/>' +
        '  </node>' +
        '</graph>'
    );

});


