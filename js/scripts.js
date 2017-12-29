$(function () {
    var pubnub = new PubNub({
        publishKey : 'pub-c-8d51c116-482c-4048-8b3f-2f58b4d2f905',
        subscribeKey : 'sub-c-7072e924-ebe9-11e7-9869-1affed3c9741'
    });

    var viewModel = {
        profile: {
            yourName: ko.observable(""),
            reasonForVisit: ko.observable(""),
            vseeId: ko.observable(""),
        },
        messageText: ko.observable("Your provider will be with you shortly"),
        showTalkToPanel: ko.observable(true),
        showConnectingPanel: ko.observable(false),
        enterWaitingRoomClick: function () {
            joinRoom(this.profile);
            this.showTalkToPanel(false);
            this.showConnectingPanel(true);
        },
        exitWaitingRoomClick: function () {
            leaveRoom(this.profile);
        },
    };
    ko.applyBindings(viewModel);

    function joinRoom(profile) {
        console.log("Since we're publishing on subscribe connectEvent, we're sure we'll receive the following publish.");
        var publishConfig = {
            channel : "dashboard",
            message : {
                payload: {
                    action: 'join',
                    profile: {
                        yourName: profile.yourName(),
                        reasonForVisit: profile.reasonForVisit(),
                        vseeId: profile.vseeId(),
                    }
                }
            }
        }
        pubnub.publish(publishConfig, function(status, response) {
            console.log(status, response);
        })
    }

    function leaveRoom(profile) {
        console.log(profile.yourName() + ' left room');
        var publishConfig = {
            channel : "dashboard",
            message : {
                payload: {
                    action: 'leave',
                    profile: {
                        yourName: profile.yourName(),
                        reasonForVisit: profile.reasonForVisit(),
                        vseeId: profile.vseeId(),
                    }
                }
            }
        }
        pubnub.publish(publishConfig, function(status, response) {
            console.log(status, response);
        })
    }

    pubnub.addListener({
        status: function(statusEvent) {
            if (statusEvent.category === "PNConnectedCategory") {
            }
        },
        message: function(m) {
            console.log(m);
            if(m.channel == 'patient-channel') {
                var payload = m.message.payload;
                var action = payload.action;
                switch(action) {
                    case 'leaveRoom':
                        if(viewModel.profile.vseeId() == payload.profile.vseeId) {
                            viewModel.showTalkToPanel(true);
                            viewModel.showConnectingPanel(false);
                        }
                        break;
                    case 'inProgress':
                        if(viewModel.profile.vseeId() == payload.profile.vseeId) {
                            viewModel.messageText('The visit is in progress');
                        } else {
                            viewModel.messageText('Doctor is currently busy and will attend to you soon');
                        }
                        break;
                }
                
            }
        },
        presence: function(presenceEvent) {
            // handle presence
            console.log(presenceEvent);
            var uuids = presenceEvent.uuids;
            console.log(uuids);
        }
    })      
    console.log("Subscribing..");
    pubnub.subscribe({
        channels: ['patient-channel'],
        withPresence: true
    });
});