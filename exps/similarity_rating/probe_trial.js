/**
 * jspsych-audio-button-response
 * Kristin Diep
 *
 * plugin for playing an audio file and getting a keyboard response
 *
 * documentation: docs.jspsych.org
 *
 **/

jsPsych.plugins["probe-trial"] = (function () {
    var plugin = {};

    jsPsych.pluginAPI.registerPreload('probe-trial', 'stimulus', 'audio');

    plugin.info = {
        name: 'probe-trial',
        description: '',
        parameters: {
            stimulus: {
                type: jsPsych.plugins.parameterType.AUDIO,
                pretty_name: 'Stimulus',
                default: undefined,
                description: 'The audio to be played.'
            },
            imgs: {
                type: jsPsych.plugins.parameterType.IMAGE,
                pretty_name: 'Imgs',
                default: undefined,
                array: true,
                description: 'The image to be displayed'
            },
            choices: {
                type: jsPsych.plugins.parameterType.STRING,
                pretty_name: 'Choices',
                default: undefined,
                array: true,
                description: 'The button labels.'
            },
            button_html: {
                type: jsPsych.plugins.parameterType.HTML_STRING,
                pretty_name: 'Button HTML',
                default: '<button class="jspsych-btn">%choice%</button>',
                array: true,
                description: 'Custom button. Can make your own style.'
            },
            prompt: {
                type: jsPsych.plugins.parameterType.STRING,
                pretty_name: 'Prompt',
                default: null,
                description: 'Any content here will be displayed below the stimulus.'
            },
            trial_duration: {
                type: jsPsych.plugins.parameterType.INT,
                pretty_name: 'Trial duration',
                default: null,
                description: 'The maximum duration to wait for a response.'
            },
            margin_vertical: {
                type: jsPsych.plugins.parameterType.STRING,
                pretty_name: 'Margin vertical',
                default: '0px',
                description: 'Vertical margin of button.'
            },
            margin_horizontal: {
                type: jsPsych.plugins.parameterType.STRING,
                pretty_name: 'Margin horizontal',
                default: '8px',
                description: 'Horizontal margin of button.'
            },
            response_ends_trial: {
                type: jsPsych.plugins.parameterType.BOOL,
                pretty_name: 'Response ends trial',
                default: true,
                description: 'If true, the trial will end when user makes a response.'
            },
            trial_ends_after_audio: {
                type: jsPsych.plugins.parameterType.BOOL,
                pretty_name: 'Trial ends after audio',
                default: false,
                description: 'If true, then the trial will end as soon as the audio file finishes playing.'
            },
            response_allowed_while_playing: {
                type: jsPsych.plugins.parameterType.BOOL,
                pretty_name: 'Response allowed while playing',
                default: true,
                description: 'If true, then responses are allowed while the audio is playing. ' +
                    'If false, then the audio must finish playing before a response is accepted.'
            }
        }
    }

    plugin.trial = function (display_element, trial) {

        // setup stimulus
        var context = jsPsych.pluginAPI.audioContext();
        if (context !== null) {
            var source = context.createBufferSource();
            source.buffer = jsPsych.pluginAPI.getAudioBuffer(trial.stimulus);
            source.connect(context.destination);
            console.log(source)
        } else {
            var audio = jsPsych.pluginAPI.getAudioBuffer(trial.stimulus);
            audio.currentTime = 0;
        }

        // set up end event if trial needs it
        if (trial.trial_ends_after_audio) {
            if (context !== null) {
                source.addEventListener('ended', end_trial);
            } else {
                audio.addEventListener('ended', end_trial);
            }
        }

        // enable buttons after audio ends if necessary
        if ((!trial.response_allowed_while_playing) & (!trial.trial_ends_after_audio)) {
            if (context !== null) {
                source.addEventListener('ended', enable_buttons);
            } else {
                audio.addEventListener('ended', enable_buttons);
            }
        }



        //display buttons
        var buttons = [];
        if (Array.isArray(trial.button_html)) {
            if (trial.button_html.length == trial.choices.length) {
                buttons = trial.button_html;
            } else {
                console.error('Error in image-button-response plugin. The length of the button_html array does not equal the length of the choices array');
            }
        } else {
            for (var i = 0; i < trial.choices.length; i++) {
                buttons.push(trial.button_html);
            }
        }

        var html = '';
        for (var i = 0; i < trial.imgs.length; i++) {
            html += '<img src="' + trial.imgs[i] + '" style="width:350px"></img>' /// this one here
        }

        html += '<div id="jspsych-audio-button-response-btngroup">';
        for (var i = 0; i < trial.choices.length; i++) {
            var str = buttons[i].replace(/%choice%/g, trial.choices[i]);
            html += '<div class="jspsych-audio-button-response-button" style="cursor: pointer; display: inline-block; margin:' + trial.margin_vertical + ' ' + trial.margin_horizontal + '" id="jspsych-audio-button-response-button-' + i + '" data-choice="' + i + '">' + str + '</div>';
        }
        html += '</div>';


        //show prompt if there is one
        if (trial.prompt !== null) {
            html += trial.prompt;
        }



        display_element.innerHTML = html;

        if (trial.response_allowed_while_playing) {
            enable_buttons();
        } else {
            disable_buttons();
        }

        // store response
        var response = {
            rt: null,
            button: null,
            img1: null,
            img2: null,
            im_cat: null,
            obj1: null,
            obj2: null,
            pairs: null
        };

        // function to handle responses by the subject
        function after_response(choice) {

            // measure rt
            var endTime = performance.now();
            var rt = endTime - startTime;
            if (context !== null) {
                endTime = context.currentTime;
                rt = Math.round((endTime - startTime) * 1000);
            }
            response.button = parseInt(choice); ///also add video image, from 170 (image name, path to image)
            response.rt = rt;
            response.img1 = trial.imgs[0];
            response.img2 = trial.imgs[1];
            var temp_obj1 = trial.imgs[0].replace(".png","").replace(".jpg","");
            response.obj1 = temp_obj1.substring(temp_obj1.length-4,temp_obj1.length);
            var temp_obj2 = trial.imgs[1].replace(".png","").replace(".jpg","");
            response.obj2 = temp_obj2.substring(temp_obj2.length-4,temp_obj2.length);
            var temp_pair1 = response.obj1.substring(3,4);
            var temp_pair2 = response.obj2.substring(3,4);
            response.pairs = [temp_pair1, temp_pair2].sort((a, b) => a-b);
            // disable all the buttons after a response
            disable_buttons();

            if (trial.response_ends_trial) {
                end_trial();
            }
        }

        // function to end trial when it is time
        function end_trial() {

            // kill any remaining setTimeout handlers
            jsPsych.pluginAPI.clearAllTimeouts();

            // stop the audio file if it is playing
            // remove end event listeners if they exist
            if (context !== null) {
                source.stop();
                source.removeEventListener('ended', end_trial);
                source.removeEventListener('ended', enable_buttons);
            } else {
                audio.pause();
                audio.removeEventListener('ended', end_trial);
                audio.removeEventListener('ended', enable_buttons);
            }
            
            // gather the data to store for the trial
            var trial_data = {
                "rt": response.rt,
                "stimulus": trial.stimulus,
                "button_pressed": response.button,
                "first_image": response.img1,
                "second_image": response.img2,
                "object1": response.obj1,
                "object2": response.obj2,
                "category": response.obj1.substring(0,3),
                "pair":  response.pairs[0] + "--" + response.pairs[1]

            };

            // clear the display
            display_element.innerHTML = '';

            // move on to the next trial
            jsPsych.finishTrial(trial_data);
        }

        function button_response(e) {
            var choice = e.currentTarget.getAttribute('data-choice'); // don't use dataset for jsdom compatibility
            after_response(choice);
        }

        function disable_buttons() {
            var btns = document.querySelectorAll('.jspsych-audio-button-response-button');
            for (var i = 0; i < btns.length; i++) {
                var btn_el = btns[i].querySelector('button');
                if (btn_el) {
                    btn_el.disabled = true;
                }
                btns[i].removeEventListener('click', button_response);
            }
        }

        function enable_buttons() {
            var btns = document.querySelectorAll('.jspsych-audio-button-response-button');
            for (var i = 0; i < btns.length; i++) {
                var btn_el = btns[i].querySelector('button');
                if (btn_el) {
                    btn_el.disabled = false;
                }
                btns[i].addEventListener('click', button_response);
            }
        }

        // start time
        var startTime = performance.now();

        // start audio
        if (context !== null) {
            startTime = context.currentTime;
            source.start(startTime);
        } else {
            audio.play();
        }

        // end trial if time limit is set
        if (trial.trial_duration !== null) {
            jsPsych.pluginAPI.setTimeout(function () {
                end_trial();
            }, trial.trial_duration);
        }

    };

    return plugin;
})();