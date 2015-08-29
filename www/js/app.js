var myApp = angular.module('starter', ['ionic', 'firebase', 'LocalStorageModule', 'ngImgCrop', 'ngDraggable']);
var fb = null;
myApp.run(function($ionicPlatform, $rootScope, $state) {
  $ionicPlatform.ready(function() {
    // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
    // for form inputs)
    if (window.cordova && window.cordova.plugins.Keyboard) {
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
    }
    if (window.StatusBar) {
      StatusBar.styleDefault();
    }
    fb = new Firebase("https://finaleproject.firebaseio.com/");
  });
  //security route login route
  $rootScope.$on('$stateChangeStart', function(event, toState, toParams) {
    var required = toState.data.requireLogin;
    if (required && typeof $rootScope.currentUser === 'undefined') {
      event.preventDefault();
      $state.go('login');
    }
  })
});
myApp.config(function($stateProvider, $urlRouterProvider) {
  $stateProvider
    .state("login", {
      url: '/login',
      templateUrl: '/templates/homeLogin.html',
      controller: 'LoginController',
      data: {
        requireLogin: false
      }
    })
    .state("tabs", {
      url: '/tab',
      abstract: true,
      templateUrl: "/templates/tabs.html",
      controller:"abstractController",
      data: {
        requireLogin: true
      }
    })
    .state("tabs.chat", {
      url: '/chat',
      views: {
        'chat-tab': {
          templateUrl: "templates/chat.html",
          controller: "chatController",
          resolve: {
            chatInfo: function(MyFireService, $rootScope) {
              return MyFireService.getUserInfo($rootScope.currentUser.uid);
            }
          }
        }
      }
    })
    .state("tabs.chatRoom", {
      url: '/chat/:Cid',
      views: {
        'chat-tab': {
          templateUrl: "templates/chatRoom.html",
          controller: "chatroomController",
          resolve: {
            chatInfo: function(MyFireService, $rootScope) {
              return MyFireService.getUserInfo($rootScope.currentUser.uid);
            }
          }
        }
      }
    })
    .state("tabs.home", {
      url: "/home",
      views: {
        'home-tab': {
          templateUrl: "templates/home.html",
          controller: "homeController",
          resolve: {
            ProfileUser: function(MyFireService, $rootScope) {
              return MyFireService.getUserInfo($rootScope.currentUser.uid);
            }
          }
        }
      }
    })
    .state("tabs.friends", {
      url: "/friends",
      views: {
        'friends-tab': {
          templateUrl: "templates/friends.html",
          controller: "friendsController",
          resolve:{
            FriendsL:function(MyFireService,$rootScope){
              return MyFireService.getFriends($rootScope.currentUser.uid);
            }
          }
        }
      }
    })
    .state("tabs.tickets", {
      url: "/tickets",
      views: {
        'tickets-tab': {
          templateUrl: "templates/tickets.html",
          controller: "ticketsController",
          resolve: {
            ProfileUser: function(MyFireService, $rootScope) {
              var Promise = MyFireService.getUserInfo($rootScope.currentUser.uid);
              return Promise;
            }
          }
        }
      }
    })
    .state("tabs.detail", {
      url: '/tickets/:ID',
      views: {
        'tickets-tab': {
          templateUrl: 'templates/ticketDetail.html',
          controller: 'ListController',
          resolve: {
            ticketDetail: function(MyFireService, $stateParams) {
              // console.log($stateParams.ID);
              return MyFireService.getTickets($stateParams.ID);
            }
          }
        }
      }
    })
    .state("tabs.itemDetail", {
      url: '/tickets/:ID/:Td',
      views: {
        'tickets-tab': {
          templateUrl: 'templates/itemDetail.html',
          controller: 'itemController',
          resolve: {
            itemDetail: function(MyFireService, $stateParams) {
              // console.log($stateParams.ID);
              return MyFireService.getItem($stateParams.ID, $stateParams.Td);
            }
          }
        }
      }
    })

  $urlRouterProvider.otherwise("/login");
});

myApp.filter('array',function(){
  return function(items){
    var filtered = [];
    angular.forEach(items,function(item){
      filtered.push(item);
    });
    return filtered;
  };
});

myApp.controller("abstractController",function($scope){
  $scope.badge = 0;
  $scope.ChangeBadge = function(num){
    $scope.badge = num;
  };
});

myApp.controller('LoginController', function($ionicLoading,$rootScope, $scope, MyFireService, $state, localStorageService,$ionicPopup) {
  $scope.showLoading = function() {
    $ionicLoading.show({
      template: 'Loading...'
    });
  };
  $scope.user = null;
  var checkLogin = function() {
    if (localStorageService.cookie.get('loginStuff')) {
      $scope.showLoading();
      MyFireService.tokenLogin(localStorageService.cookie.get('loginStuff'))
        .then(function(data) {
          $ionicLoading.hide();
          $state.go('tabs.home');
        }).catch(function(er) {
          $ionicLoading.hide();
          console.error(er);
          $state.go('login');
        });
    }else{
      return;
    };
  }();
  $scope.login = function(user) {
    $scope.showLoading();
    if (user) {
      MyFireService.login(user).then(function(data) {
        if (data.token) {
          localStorageService.cookie.set('loginStuff', data.token);
        };
        $ionicLoading.hide();
        $scope.user = {};
        $state.go('tabs.home');
      }).catch(function(E) {
        console.log(E);
      })

    } else {
      $ionicLoading.hide();
      $state.go('login');
    }
  };
  $scope.register = function(user) {
    if (user) {
      MyFireService.register(user).then(function(data) {
        if (data.token) {
          localStorageService.cookie.set('loginStuff', data.token);
        }
        $state.go('tabs.home');
      }).catch(function(E) {

      })

    } else {
      $state.go('login');
    }
  };
});

myApp.controller('homeController', function($rootScope, $scope, $state, MyFireService, $ionicModal, localStorageService, ProfileUser) {
  //resolve data from firebase with ProfileUser!
  var init = function() {
    $scope.balance = 0;
    $scope.image = {
      originalImage: '',
      croppedImage: ''
    };
    $scope.showCropPic = false;
    ProfileUser.$loaded().then(function(data) {
      $scope.profileUserInfo = data;
      MyFireService.calMyBalance(data).then(function(response) {
        response.forEach(function(item) {
          item.$loaded().then(function(res) {
            $scope.balance += sumUrTotal(res.entries,$rootScope.currentUser.uid);
          });
        });
      });
    });
  };

  init();

  $scope.logout = function() {
    //console.log("ready to logout!!");
    MyFireService.logout();
    $rootScope.currentUser = null;
    localStorageService.cookie.remove('loginStuff');
    $state.go('login');
  }
  $scope.openFile = function() {
    ionic.trigger('click', {
      target: document.getElementById('MyFile')
    });
    //fire the eventListener (fire here because the modal need a little bit of time to initialize the DOM)
    angular.element(document.querySelector('#MyFile')).on('change', handleFileSelect);
  };
  var handleFileSelect = function(evt) {
    $scope.showCropPic = true;
    console.log(evt.currentTarget);
    var file = evt.currentTarget.files[0];
    var reader = new FileReader();
    reader.onload = function(evt) {
      $scope.$apply(function($scope) {
        $scope.image.originalImage = evt.target.result;
      });
    };
    reader.readAsDataURL(file);
  };
  //ionic Modal options
  $ionicModal.fromTemplateUrl('templates/UserDetailModal.html', function($ionicModal) {
    $scope.modal = $ionicModal;
  }, {
    scope: $scope, //passing the parent scope here to modal!
    animation: 'slide-in-up'
  }).then(function(modal) {});

  $scope.$on('$destroy', function() {
    console.log('Destroying modals...');
    $scope.modal.remove();
  });

  $scope.setprofilePicAndSave = function() {
    //console.log($scope.image.croppedImage);
    //console.log($scope.showCropPic);
    if ($scope.showCropPic)
      $scope.profileUserInfo.userInfo.profilePic = $scope.image.croppedImage;

    $scope.profileUserInfo.$save();
    if ($scope.profileUserInfo.hasOwnProperty('userInfo') && $scope.profileUserInfo.userInfo.hasOwnProperty('nickName')) {
      MyFireService.getUserList($scope.profileUserInfo.$id).$loaded().then(function(data){
        data.nickName = $scope.profileUserInfo.userInfo.nickName;
        data.uid = $scope.profileUserInfo.$id;
        data.$save();
      });
    };
    $scope.modal.hide();
  };

  $scope.refresh = function() {
    init();
    $scope.$broadcast('scroll.refreshComplete');
  };

  $scope.go = function(where) {
    $state.go(where);
  };
});

myApp.controller("friendsController", function($q,$ionicPopup,$rootScope,$timeout,$scope, MyFireService,FriendsL) {
  $scope.show = false;
  //$scope.friendsList = [];
  $scope.searchList = [];
  $scope.myFriends=[];
  $scope.myFriendsPic=[];

  FriendsL.$loaded().then(function(data){
    $scope.myFriends = data.friend;
    //console.log($scope.myFriends);
    for(var index in $scope.myFriends){
      MyFireService.getImage($scope.myFriends[index].uid).then(function(res){
        $scope.myFriendsPic.push(res);
      });
    };
  });

  var info = MyFireService.getUserList();
  $scope.$watch('queryInput', function(newValue, oldValue) {
    if (newValue === oldValue) {
      return;
    }
    $scope.show = true;
    //$debounce(applyQuery, 500);
    $timeout(applyQuery,500);
  });
  var ListCheck = function(list, obj) {
    var flag = true;
    list.forEach(function(i) {
      if (i.nickName === obj.nickName)
        flag = false;
    });
    return flag;
  };
  var applyQuery = function() {
      $scope.searchList = [];
      $scope.searchListPic = [];
      var picPromisList = [];
      info.$loaded().then(function(data) {
          data.forEach(function(item) {
            //console.log(item.nickName)
            if (item.nickName.indexOf($scope.queryInput.trim()) != -1 && $scope.queryInput.trim() != '') {
              $scope.show = false;
              if (ListCheck($scope.searchList, item)) {
                $scope.searchList.push(item);
                picPromisList.push(MyFireService.getImage(item.uid).then(function(res) {
                  return res;
                }));
              }
              //console.log('find it',$scope.queryInput);
            } else {
              //console.log('no match!');
              $scope.show = false;
            };
          });
          $q.all(picPromisList).then(function(values) {
           $scope.searchListPic = values;
          });
          //console.log($scope.searchListPic.then(function(data){return data}))
        });
      };
  $scope.refresh = function() {
    $scope.myFriendsPic=[];
    FriendsL.$loaded().then(function(data) {
      $scope.myFriends = data.friend;
      for (var index in $scope.myFriends) {
        MyFireService.getImage($scope.myFriends[index].uid).then(function(res) {
          $scope.myFriendsPic.push(res);
        });
      };
    });
    $scope.$broadcast('scroll.refreshComplete');
  };
  //should be rewrite to add notice system!!!!!!!!!!!!!!!!!!!!!!!!!
  $scope.addFriend = function(obj){
    //console.log($scope.myFriends)
    if(obj.uid === $rootScope.currentUser.uid){
      $ionicPopup.alert({ 
        title: 'Error',
          template: 'You Cannot Add Yourself!',
          okType:'button-assertive'
        }).then(function(res){
          return;
        });
    }else if(!$scope.myFriends){
      FriendsL.friend={};
      FriendsL.totalNum = 1;
      FriendsL.friend[obj.uid] = obj;
      // This is the first step, I will update the notice system after!!!!!!!!!!!!
      // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
      // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
      // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
      // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
      // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
      // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
      FriendsL.$save();

    } else if( $scope.myFriends.hasOwnProperty(obj.uid)){
      $ionicPopup.alert({ 
        title: 'Error',
          template: 'You guys are already friends!',
          okType:'button-assertive'
        }).then(function(res){
          return;
        });
    } else {
      // This is the first step, I will update the notice system after!!!!!!!!!!!!
      // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
      // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
      // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
      // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
      // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
      // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!     
      FriendsL.friend[obj.uid] = obj;
      FriendsL.totalNum++;
      FriendsL.$save();
    };
  };
  $scope.delete = function(friend){
    $ionicPopup.confirm({
      title:'Unfriend Confirm!',
      template:'Are You Sure You want to Unfriend with <b>'+ friend.nickName+'</b>'
    }).then(function(res){
      if(res){
        //console.log('You want to delete this friend');
        FriendsL.$loaded().then(function(data){
          data.totalNum --;
          delete data.friend[friend.uid];
          data.$save()
          $scope.refresh();
        });
      }else{
        //console.log("no you don't");
      }
    });
  };
});

myApp.controller("ticketsController", function($q,$scope, $rootScope, $ionicModal, $ionicPopup, ProfileUser, MyFireService) {
  $scope.ticket = {};
  $scope.pics = [];
  $scope.showCustomerFriendsInput = false;
  //handel start array
  $scope.initialize = function() {
    $scope.friends = [];
    $scope.myTickets = [];
    var picPromise = [];
    ProfileUser.$loaded().then(function() {
      if (ProfileUser.hasOwnProperty('friends')) {
        for (var key in ProfileUser.friends.friend) {
          var obj = ProfileUser.friends.friend[key];
          $scope.friends.push(obj);
          picPromise.push(MyFireService.getImage(ProfileUser.friends.friend[key].uid).then(function(data) {
            // console.log(data);
            return data;
          }));
        };
        $q.all(picPromise).then(function(res) {
          return res;
        }).then(function(values) {
          $scope.pics = values;
        });
      };
      //$scope.myTickets = ProfileUser.tickets.entry;
      //console.log(ProfileUser.$id)
      if (ProfileUser.hasOwnProperty('tickets')) {
        for (var index in ProfileUser.tickets.entry) {
          var getT = MyFireService.getTickets(ProfileUser.tickets.entry[index].tid);
          getT.$loaded().then(function(data) {
            //console.log(data);
            $scope.myTickets.push(data);
          })
        };
      };
    });
  };
  $scope.initialize();
  $scope.ParticipantsList = [];
  $scope.refresh = function() {
    $scope.initialize();
    $scope.$broadcast('scroll.refreshComplete');
  };
  $scope.onDropComplete1 = function(data, evt) {
    var index = $scope.ParticipantsList.indexOf(data);
    if (index == -1)
      $scope.ParticipantsList.push(data);
    for (var i = $scope.ParticipantsList.length - 1; i >= 0; i--) {
      if ($scope.ParticipantsList[i] === null) {
        $scope.ParticipantsList.splice(i, 1);
      }
    }
  };
  $scope.onDragSuccess1 = function(data, evt) {
    console.log("133", "$scope", "onDragSuccess1", "", evt);
    var index = $scope.ParticipantsList.indexOf(data);
    console.log(index);
    if (index > -1) {
      $scope.ParticipantsList.splice(index, 1);
      //console.log($scope.ParticipantsList);
    }
  };
  $scope.Delete = function(index) {
    console.log(index);
    $scope.ParticipantsList.splice(index, 1);
  }
  $scope.add = function(index) {
    if ($scope.ParticipantsList.indexOf($scope.friends[index]) === -1) {
      $scope.ParticipantsList.push($scope.friends[index]);
    }
  };
  $scope.addCustom = function(name) {
    var obj = {
      nickName: name,
      uid: 'none'
    };
    var flag = true;
    $scope.ParticipantsList.forEach(function(item) {
      if (item.nickName === name) {
        flag = false;
      };
    });
    if (flag && name !== undefined && name !== "") {
      $scope.ParticipantsList.push(obj);
    }
  };
  $scope.addTicket = function(ticket) {
    if (ticket.name) {
      $scope.ParticipantsList.push({
        nickName: ProfileUser.userInfo.nickName,
        uid: $rootScope.currentUser.uid
      });
      console.log(ticket, " + ", $scope.ParticipantsList);
      MyFireService.addTicket(ticket, $scope.ParticipantsList);
      $scope.modal.hide();
      $scope.ticket = {};
      $scope.ParticipantsList = [];
    } else {
      var showAlert = function() {
        var alertPopup = $ionicPopup.alert({
          title: 'Error',
          template: 'Please Input the Tickcet Name!'
        });
        alertPopup.then(function(res) {
          console.log('Get Alert');
        });
      }();
    }
  };

  $ionicModal.fromTemplateUrl('templates/addTicket.html', function($ionicModal) {
    $scope.modal = $ionicModal;
  }, {
    scope: $scope, //passing the parent scope here to modal!
    animation: 'slide-in-up'
  }).then(function(modal) {});

  $scope.$on('$destroy', function() {
    console.log('Destroying modals...');
    $scope.modal.remove();
  });
});

myApp.controller("ListController", function($scope, ticketDetail, $ionicModal, $ionicPopup, MyFireService, $rootScope, $stateParams) {

  var showOtherBalance = function(data) {
    var list = angular.copy(data.participants);
    var userIndex = NaN;
    var sum = [];
    var positive = [];
    var positiveWeight = [];
    var negative = [];
    var PosiSum = 0;
    // var sum2 = [];
    list.forEach(function(item, index, array) {
      //console.log(item);
      sum.push(sumUrTotal(data.entries, item.uid));
      if (item.uid === $rootScope.currentUser.uid)
        userIndex = index;
      // sum2.push(sumUrTotalAverage(data.entries,item.uid));
    });
    sum.forEach(function(i, index) {
      if (i >= 0) {
        positive.push(index);
        PosiSum += i;
      } else
        negative.push(index);
    });
    PosiSum = PosiSum;
    positive.forEach(function(i) {
      //console.log(i,sum[i]);
      positiveWeight[i] = sum[i] / PosiSum;
    });
    //console.log(sum[userIndex]);
    if (sum[userIndex] >= 0) {
      var res=[];
      negative.forEach(function(i) {
        res[i]="Owe you "+ strip(positiveWeight[userIndex]*sum[i] *-1);
      });
    }else{
      var res=[];
      positive.forEach(function(i){
        res[i] = "You owed "+ strip(positiveWeight[i]*sum[userIndex] *-1)
      });
    };
    return res;
  };
  //initializing
  var init = function(){
    $scope.item = {};
    $scope.paidByList = [];
    $scope.weight = [];
    $scope.accountInfo = {};
    ticketDetail.$loaded().then(function(data) {
      $scope.ticketInfo = data;
      $scope.accountInfo.total = sumTotal(data.entries);
        $scope.showother = showOtherBalance(data);
      if ($scope.accountInfo.total) {
        $scope.accountInfo.yourTotal = sumUrTotal(data.entries,$rootScope.currentUser.uid);
      };
      for (var i = 0; i < $scope.ticketInfo.participants.length; i++) {
        $scope.weight[i] = 1;
      };
    });
  };
  init();
  //initializing
  $scope.refresh = function() {
    init();
    $scope.$broadcast('scroll.refreshComplete');
  };
  $scope.whatColor = function(value) {
    if (value >= 0)
      return "Green";
    else
      return "red";
  };
  $scope.addWeight = function(index) {
    $scope.data = {};
    $ionicPopup.show({
      template: '<label class="item item-input"><span class="input-label"></span><input type="number" ng-model="weight[' + index + ']"></label>',
      title: 'Enter weight of ' + $scope.ticketInfo.participants[index].nickName,
      subTitle: 'Please Input an integer',
      scope: $scope,
      buttons: [{
        text: 'Cancel'
      }, {
        text: '<b>OK</b>',
        type: 'button-positive',
        onTap: function(e) {
          if ($scope.weight[index] < 0 || typeof $scope.weight[index] !== "number") {
            $ionicPopup.alert({
              title: 'Invalidate Input!!',
              template: 'Please Input Positive Integer only!',
              okType: 'button-assertive'
            });
            return;
            e.preventDefault();
          } else {
            return "success";
          }
        }
      }]
    }).then(function(res) {
      console.log(res);
      //success
      if (!res) {
        //console.log("res");
        $scope.weight[index] = 1;
      }
      console.log($scope.weight);
    }).catch(function(e) {
      console.error(e);
    });
  };
  $scope.filterParticipants = function(people) {
    var flag = true;
    $scope.paidByList.forEach(function(i) {
      if (i.people.nickName === people.nickName) {
        flag = false;
      }
    });
    return flag;
  };
  $scope.delIt = function(index) {
    console.log(index)
    $scope.paidByList.splice(index, 1);
  };

  $scope.addPaidBy = function(item, obj) {
    $scope.data = {};
    if (!obj.hasOwnProperty('amount') || !obj.amount) {
      $ionicPopup.alert({
        title: 'Bad Input!',
        template: 'Amount Has not Been Set yet! Please Input Amount First!',
        okType: 'button-assertive'
      });
      return;
    };
    var copyObj = angular.copy(obj);
    if ($scope.paidByList) {
      var sum = 0;
      $scope.paidByList.forEach(function(i) {
        sum += i.amount;
      });
      copyObj.amount = copyObj.amount - sum;
      copyObj.amount = strip(copyObj.amount);
    };

    $scope.data.amount = copyObj.amount;

    //console.log(item,$scope.item);
    $ionicPopup.show({
      template: '<label class="item item-input"><span class="input-label icon ion-social-usd"></span><input type="number" ng-model="data.amount"></label>',
      title: 'Enter Paid Amount by ' + item.nickName,
      subTitle: 'Please Input an amount less than ' + copyObj.amount + ' $',
      scope: $scope,
      buttons: [{
        text: 'Cancel'
      }, {
        text: '<b>add</b>',
        type: 'button-positive',
        onTap: function(e) {
          if (!$scope.data.amount || $scope.data.amount === 0 || $scope.data.amount > copyObj.amount || $scope.data.amount < 0) {
            $ionicPopup.alert({
              title: 'Invalidate Input!',
              template: 'Amount is overranged !!',
              okType: 'button-assertive'
            });
            return;
            //e.preventDefault();
          } else {
            return $scope.data.amount;
          }
        }
      }]
    }).then(function(res) {
      console.log(res);
      //success
      if (res > 0 && typeof res === "number") {
        $scope.paidByList.push({
          'people': item,
          'amount': res
        });
      };
    }).catch(function(e) {
      console.error(e);
    });
  };

  $scope.updateTicketInfo = function() {
    //check validation!!
    //console.log($scope.paidByList);
    //console.log($scope.item);
    if ($scope.paidByList.length === 0) {
      $ionicPopup.alert({
        title: 'Paid By List is Not Validated !!',
        template: 'Please choose one into Paid By List!',
        okType: 'button-assertive'
      });
      return;
    };
    if (!$scope.item.hasOwnProperty('amount')) {
      $ionicPopup.alert({
        title: 'Amount is Not Validated !!',
        template: 'Please input Amount!'
      });
      return;
    };
    if (!$scope.item.hasOwnProperty('category')) {
      $scope.item.category = "Others";
    };
    if (!$scope.item.hasOwnProperty('description')) {
      $scope.item.description = "";
    };
    //console.log($scope.ticketInfo);
    var date = Date.now();
    date = date.toString();
    MyFireService.addTicketItem($scope.ticketInfo.$id, date).$loaded().then(function(data) {
      if ($scope.item.description) {

      };
      data.time = date;
      data.amount = $scope.item.amount;
      data.paidByList = $scope.paidByList;
      data.participants = $scope.ticketInfo.participants;
      data.weight = $scope.weight;
      data.description = $scope.item.description;
      data.category = $scope.item.category;
      data.$save();
      //clear up
      $scope.item = {};
      $scope.weight = [];
      $scope.paidByList = [];
      $scope.oModal2.hide();
    });
  };

  $ionicModal.fromTemplateUrl('templates/editTicket.html', {
    id: '1',
    scope: $scope, //passing the parent scope here to modal!
    animation: 'slide-in-up'
  }).then(function(modal) {
    $scope.oModal1 = modal;
  });

  $ionicModal.fromTemplateUrl('templates/addItem.html', {
    id: '2',
    scope: $scope, //passing the parent scope here to modal!
    animation: 'slide-in-up'
  }).then(function(modal) {
    $scope.oModal2 = modal;
  });
  $scope.$on('$destroy', function() {
    console.log('Destroying modals...');
    $scope.oModal1.remove();
    $scope.oModal2.remove();
  });
});

myApp.controller("itemController", function($scope, itemDetail) {
  itemDetail.$loaded().then(function(data) {
    $scope.info = data;
  })
});

myApp.controller("chatController", function($scope, $ionicPopup, $q,$ionicModal, $rootScope,MyFireService,chatInfo) {
  //$scope.ChangeBadge(12); Call parent scope to change badge!!!!!!
  var init = function() {
    $scope.chats = [];
    $scope.chatsNew = [];
    $scope.chatList = [];
    $scope.pics = [];
    $scope.input = {};
    $scope.showList = false;
    $scope.friendsList = {};
    MyFireService.getFriends($rootScope.currentUser.uid).$loaded().then(function(result) {
      var picPromise = [];
      $scope.friendsList = result.friend;
      for (var key in $scope.friendsList) {
        // console.log($scope.friendsList[key].uid);
        picPromise.push(MyFireService.getImage($scope.friendsList[key].uid).then(function(res) {
          return res;
        }));
      };
      $q.all(picPromise).then(function(values) {
        $scope.pics = values;
      });
    });
    chatInfo.$loaded().then(function(data) {
      var chatPromise = [];
      if (data.hasOwnProperty('chat')) {
        for(var key in data.chat.entries) {
          $scope.chatsNew.push(data.chat.entries[key].new);
          chatPromise.push(MyFireService.getChat(key).$loaded().then(function(res) {
             return res
           }));
        };
        $q.all(chatPromise).then(function(values) {
          $scope.chats = values;
          console.log(values)
        });
      }
    });
  };
  init();
  $scope.refresh = function(){
    init();
    $scope.$broadcast('scroll.refreshComplete');
  };
  $scope.addToChat = function(item){
    $scope.chatList.push(item);
  };
  $scope.deleteFromChat = function(index){
     $scope.chatList.splice(index,1);
  };
  $scope.filterFriends = function(people) {
    var flag = true;
    $scope.chatList.forEach(function(i) {
      if (i.nickName === people.nickName) {
        flag = false;
      }
    });
    return flag;
  };

  $scope.submitChat = function(){
    //console.log($rootScope.currentUser);
    if($scope.chatList.length === 0){
      $ionicPopup.alert({ 
        title: 'Error',
          template: 'INPUT is NOT Validated !!',
          okType:'button-assertive'
        }).then(function(){});
      return;
    }else if ($scope.input.name){
      MyFireService.getNewChat($scope.chatList,$scope.input.name,$rootScope.currentUser.uid);
      $scope.modal.hide();
    }else {
      var name = 'Chat with ';
      $scope.chatList.forEach(function(i){
        name += i.nickName+' ';
      });
      MyFireService.getNewChat($scope.chatList,name,$rootScope.currentUser.uid);
      $scope.modal.hide();
    }
  };

  $ionicModal.fromTemplateUrl('templates/write.html', function($ionicModal) {
    $scope.modal = $ionicModal;
  }, {
    scope: $scope, //passing the parent scope here to modal!
    animation: 'slide-in-up'
  }).then(function(modal) {});

  $scope.$on('$destroy', function() {
    console.log('Destroying modals...');
    $scope.modal.remove();
  });
});

myApp.controller("chatroomController",function($scope){

});

//public functions
var sumTotal = function(entries) {
  var sum = 0;
  for (var key in entries) {
    sum += entries[key].amount;
  }
  return sum;
};
var sumUrTotal = function(entries, user) {
  //console.log(entries,$rootScope.currentUser.uid);
  var sumForU = 0;
  var uPaid = 0;
  for (var key in entries) {
    var weight = entries[key].weight.reduce(function(a, b) {
      return a + b
    });
    var i = 0
    for (; i < entries[key].participants.length; i++) {
      if (entries[key].participants[i].uid === user)
        break;
    }
    sumForU += (entries[key].amount * entries[key].weight[i]) / (weight);

    entries[key].paidByList.forEach(function(item) {
      if (item.people.uid === user)
        uPaid += item.amount;
    });
  };
  return strip(uPaid - sumForU);
  console.log(sumForU, uPaid);
};
var strip = function(number) {
  return (parseFloat(number.toFixed(2)));
};
var sumUrTotalAverage = function(entries, user) {
  //console.log(entries,$rootScope.currentUser.uid);
  var sumForU = 0;
  for (var key in entries) {
    var weight = entries[key].weight.reduce(function(a, b) {
      return a + b
    });
    var i = 0
    for (; i < entries[key].participants.length; i++) {
      if (entries[key].participants[i].uid === user)
        break;
    }
    sumForU += (entries[key].amount * entries[key].weight[i]) / (weight);
  };
  return strip(sumForU);
};