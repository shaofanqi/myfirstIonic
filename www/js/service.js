var myApp = angular.module('starter');
var fbURL = "https://finaleproject.firebaseio.com/";


myApp.service('MyFireService', function($firebaseAuth, $rootScope, $q, $firebaseObject) {
	var self = this;
	fb = new Firebase(fbURL);
	this.login = function(user) {
		return $firebaseAuth(fb).$authWithPassword({
			email: user.username,
			password: user.password
		}).then(function(authData) {
			$rootScope.currentUser = authData;
			return authData;
		}).catch(function(Err) {
			alert("Error :" + Err);
		})
	};
	this.register = function(user) {
		return $firebaseAuth(fb).$createUser({
			email: user.username,
			password: user.password
		}).then(function(authData) {
			console.log(authData);
			return $firebaseAuth(fb).$authWithPassword({
				email: user.username,
				password: user.password
			}).then(function(authData) {
				$rootScope.currentUser = authData;
				//sycn the user tree at firebase!!!
				delete authData.token;
				delete authData.auth;
				var fbUser = $firebaseObject(new Firebase(fbURL + 'users/' + authData.uid));
				fbUser.data = authData;
				fbUser.$save();
				return authData;
			}).catch(function(Err) {
				alert("Error :" + Err);
			});
		}).catch(function(Err) {
			alert("Error :" + Err);
		})
	};
	this.tokenLogin = function(token) {

		var deferred = $q.defer();
		fb.authWithCustomToken(token, function(error, authData) {
			if (error) {
				deferred.reject('ERROR' + error);
			} else {
				$rootScope.currentUser = authData;
				deferred.resolve(authData);
			};
		});
		return deferred.promise;
	};
	this.logout = function() {
		$firebaseAuth(fb).$unauth();
	};
	this.getUserInfo = function(uid) {
		return $firebaseObject(new Firebase(fbURL + 'users/' + uid));
	};
	this.getUserList = function(uid){
		if(uid)
			return $firebaseObject(new Firebase(fbURL + 'usersList/' + uid));
		else
			return $firebaseObject(new Firebase(fbURL + 'usersList/'));
	};
	this.getFriends = function(uid){
		return $firebaseObject(new Firebase(fbURL+'users/'+uid+'/friends'));
	};
	this.getAllUsers = function() {
		return $firebaseObject(new Firebase(fbURL + 'users/'));
	};
	this.getTickets = function(ticketId) {
		return $firebaseObject(new Firebase(fbURL + 'tickets/' + ticketId));
	};
	this.getImage = function(uid) {
		var deferred = $q.defer();
		var ref = new Firebase(fbURL + 'users/' + uid + '/userInfo/profilePic');
		ref.on("value", function(data) {
			//console.log(data);
			deferred.resolve(data.val());
		}, function(errorObject) {
			alert("Fail : " + errorObject.code);
		})
		return deferred.promise;
	};
	this.addTicket = function(ticket, participants) {
		var date = Date.now();
		var tid = guid();

		var ticketObj = $firebaseObject(new Firebase(fbURL + 'tickets/'));
		// if(ticketObj.hasOwnProperty('totalNum')){
		// 	ticketObj.totalNum ++;
		// }else{
		// 	ticketObj.totalNum = 1;
		// 	ticketObj.$save();
		// };
		if(!ticket.hasOwnProperty("description")){
			ticket.description="";
		}
		ticketObj.$loaded().then(function() {
			ticketObj[tid] = {
				'tid': tid,
				'name': ticket.name,
				'time': date,
				'description': ticket.description,
				'participants': participants
			};
			ticketObj.$save();
		});

		for (var one in participants) {

			if (participants[one].uid !== "none") {
				console.log(participants[one])
				this.ticketNumAddOne(participants[one].uid, tid);
			}
		}
	};
	this.addTicketItem = function(tid, date) {
		console.log(tid, date);
		return $firebaseObject(new Firebase(fbURL + 'tickets/' + tid + '/entries/' + date));
	};
	this.ticketNumAddOne = function(uid, tid) {
		var userTicket = $firebaseObject(new Firebase(fbURL + 'users/' + uid + '/tickets/'));
		userTicket.$loaded().then(function() {
			if (userTicket.hasOwnProperty('totalNum')) {
				userTicket.totalNum++;
				userTicket.entry.push({
					'tid': tid
				});
			} else {
				userTicket.totalNum = 1;
				userTicket.entry = [];
				userTicket.entry.push({
					'tid': tid
				});
			};
			userTicket.$save();
		});
	};
	this.getItem = function(tid, td) {
		return $firebaseObject(new Firebase(fbURL + 'tickets/' + tid + '/entries/' + td));
	};
	this.calMyBalance = function(user) {
		var promises = [];
		angular.forEach(user.tickets.entry,function(item){
			//var promise = $firebaseObject(new Firebase(fbURL + 'tickets/' + item.tid));
			var promise = self.getTickets(item.tid);
			promises.push(promise);
		});
		return $q.all(promises);
	};
	this.getNewChat = function(list, name, myUid) {
		var cid = guid();
		var my = {};
		my.uid = myUid;
		$firebaseObject(new Firebase(fbURL + 'usersList/' + myUid)).$loaded().then(function(res) {
			my.nickName = res.nickName;
			list.push(my);
			$firebaseObject(new Firebase(fbURL + 'chats/' + cid)).$loaded().then(function(data) {
				data.cid = cid;
				data.name = name;
				data.modifiedTime=Date.now();
				data.entry = [{
						'type':'normal',
						'sender':'system',
						'content':"Let's begin to talk!",
						'timeStamp':Date.now()
				}];
				data.active = true;
				data.chatList = list;
				data.$save();
				list.forEach(function(item){
					$firebaseObject(new Firebase(fbURL + 'users/' + item.uid+'/chat')).$loaded().then(function(res){
						if (res.hasOwnProperty('entries')) {
							res.entries[cid] = {
								'new': 1,
								'cid': cid
							};
							res.$save();
						} else {
							res.entries = {};
							res.entries[cid] = {
								'new': 1,
								'cid': cid
							};
							res.$save();
						}
					});
				});
			});
		});
	};
	this.getChat = function(cid){
		return $firebaseObject(new Firebase(fbURL + 'chats/' + cid));
	};
});

var guid = function() {
	function s4() {
		return Math.floor((1 + Math.random()) * 0x10000)
			.toString(16)
			.substring(1);
	}
	return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
		s4() + '-' + s4() + s4() + s4();
}