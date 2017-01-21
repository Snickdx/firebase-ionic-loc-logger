//TODO ping pieman
//TODO time picker bugfix
//TODO sms features
//TODO data caching
//TODO update cache on notification
angular.module('app.controllers', [])
  
  .controller('pieManStatusCtrl', function($scope, ionicToast, FB, $location, $timeout, ionicTimePicker, ionicDatePicker){
    
    $scope.userData = FB.getUserData();
    
    $scope.$on('loggedIn', function(event) {
      $scope.userData = FB.getUserData();
      $scope.ui = $scope.userData.type == 'pieman';
    });
  
    $scope.$on('noAuth', function(event) {
      $scope.userData = null;
      $scope.ui = false;
    });
    
    $scope.time = {};
  
    $scope.state = null;
    
    $scope.loading = true;
    
    $scope.arrive = null;
    
    $scope.depart = null;
    
    $scope.duration = 0;
    
    $scope.countdown = null;
    
    $scope.refresh = () => {
      console.log($scope.pietime);
      $scope.arrive = moment($scope.pietime.arrive);
      $scope.depart = moment($scope.pietime.depart);
      let now = new moment();
  
      if($scope.arrive.isBefore(now) && $scope.depart.isAfter(now)){
        $scope.state = 'In SAC';
        $scope.duration = $scope.depart.diff(now, 'seconds');
        $scope.countdown = true;
      }else if($scope.arrive.isBefore(now) && $scope.depart.isBefore(now)){
        $scope.state = 'Left SAC';
        $scope.duration = now.diff($scope.depart, 'seconds');
        $scope.countdown = false;
      }else if($scope.arrive.isAfter(now) && $scope.depart.isAfter(now)){
        $scope.state = 'Coming To SAC';
        $scope.duration = $scope.arrive.diff(now, 'seconds');
        $scope.countdown = true;
      }
      console.log($scope.state, $scope.duration);
      $scope.setClock($scope.duration, $scope.countdown);
    };
    
    $scope.pretty = (time) => {
      return moment(time).format(' DD MMM YYYY hh:mm:ss A');
    };
    
    FB.onChange('/pietime', 'value', pietime => {
      $scope.pietime = pietime.val();
      $scope.refresh();
      $scope.loading = false;
    });
    
    $scope.setClock = (duration, countdown) => {
      
      $('.clock1').FlipClock( duration, {
        countdown: countdown,
        callbacks: {
         interval: ()=>{
           if(countdown){
             duration--;
             console.log(duration);
             if(duration == 0){
                 $scope.loading = true;
                 $timeout($scope.refresh(), 3000);
                 $scope.loading = false;
             }
           }
         }
        }
      });
      
    };
    
    function setTime(newDate, callback){
      ionicTimePicker.openTimePicker({
        callback: function (newTime) {
          if (typeof (newTime) === 'undefined') {
            console.log('Time not selected');
          } else {
            let datetime = moment(newDate) + new Date(newTime)*1000;
            console.log('Selected epoch is', moment(datetime).format("DD MMM YYYY hh:mm:ss A"), datetime);
            callback(datetime);
          }
        },
        format: 12,
        step: 1
      });
    }
    
    $scope.setTime = () => {
      
      ionicDatePicker.openDatePicker({
        callback: function (newDate) {
          
          setTime(newDate, arriveTime => {
            ionicToast.show('Set Departure Time', 'top', false, 1000);
              ionicDatePicker.openDatePicker({
                callback: function (newDate) {
                  setTime(newDate, departTime => {
                    let time = {
                      notified: false,
                      arrive: arriveTime,
                      depart: departTime
                    };
                    FB.update(`/pietime`, time);
                    $scope.setClock(time);
                  });
                },
                templateType: 'modal'
              });
          });
          
          ionicToast.show('Set Arrival Time', 'top', false, 1000);
        },
        templateType: 'modal'
      });
      
    };
    
  })
  
  .controller('piePollsCtrl', function($scope, ionicToast, FB, $location, $interval) {
    
    
    $scope.time = moment().format('hh:mm:ss A');
    
    $scope.options = {
      chart: {
        type: 'pieChart',
        x: function(d){return d.key;},
        y: function(d){return d.y;},
        showLabels: true,
        duration: 400,
        height: 250,
        labelThreshold: 0.01,
        labelSunbeamLayout: true,
        tooltip:{
          enabled: true
        }
      }
    };
    
    $scope.data = [
      {
        key: "Yes",
        y: 0
      },
      {
        key: "No",
        y: 0
      }
    ];
    
    $interval(function() {
      $scope.time = moment().format('hh:mm:ss A');
    }, 1000);
    
    $interval(function(){
      $scope.updateData();
    }, 1000);
    
    $scope.updateData = function(){
      $scope.data[0].y = 0;
      $scope.data[1].y = 0;
      $scope.data.list = [];
      var flag = true;
      var latest = null;
      FB.getOrderedbyLast('feed','time',100).on('child_added', function(snapshot){
        
        var ms = moment().diff(moment(snapshot.val().time,"x"));
        
        if(ms < 3600000){
          if(flag){
            latest = moment(snapshot.val().time);
            $scope.data.start = moment(snapshot.val().time).format('hh:mm:ss A');
            flag = false
          }
          $scope.data.list.push(snapshot.val());
          if(snapshot.val().present)$scope.data[0].y++;
          else $scope.data[1].y++;
        }
        
      });
      
      if(latest != null) $scope.data.end = latest.add(1, 'hours').format('hh:mm:ss  A Do MMM');
      
    };
    
    $scope.report = function(){
      if(FB.auth == null)ionicToast.show('Login required, open top left menu to login', 'bottom', false, 4000);
      else {
        $location.path('/reportDetail');
      }
    };
    
  })
  
  .controller('reportFeedCtrl', function($scope, FB) {
    $scope.feed = FB.getCollection('feed');
    
    $scope.format = function(time){
      return moment(time).format('hh:mm:ss A');
    }
    
  })
  
  .controller('leaveFeedbackCtrl', function($scope, FB, ionicToast) {
    $scope.input = {};
    $scope.send = function(){
      console.log(FB.userData);
      if(FB.auth == null)ionicToast.show('Login required, open top left menu to login', 'bottom', false, 4000);
      else{
        FB.push('userFeedback/'+FB.auth.uid, {
          message: $scope.input.feedback,
          user: FB.userData.username,
          email: FB.userData.email == undefined ? 'anonymous' : FB.userData.email
        });
        ionicToast.show('Thanks!', 'bottom', false, 4000);
        $scope.input.feedback = "";
      }
    }
  })
  
  .controller('pieReportCtrl', function($scope, FB, ionicToast, $location) {
    $scope.input = {
      toggle:false,
      beef: false,
      cheese: false,
      chicken: false,
      coconut: false,
      currants: false,
      fish: false,
      macaroni: false,
      smoke: false
    };
    var hash ="";
    hash+= $scope.input.beef ? '1' : '0';
    hash+= $scope.input.cheese ? '1' : '0';
    hash+= $scope.input.chicken ? '1' : '0';
    hash+= $scope.input.coconut ? '1' : '0';
    hash+= $scope.input.currants ? '1' : '0';
    hash+= $scope.input.fish ? '1' : '0';
    hash+= $scope.input.macaroni ? '1' : '0';
    hash+= $scope.input.smoke ? '1' : '0';
    hash+= $scope.input.beef ? '1' : '0';
    
    $scope.getLastPost = function(userId){
      return FB.getCollection('feed').$loaded(function(feed){
        var found = null;
        feed.forEach(function(post){
          if(post.userid == userId){
            found = post;
            return post;
          }
        });
        return found;
      });
    };
    
    $scope.send = function(){
      
      $scope.getLastPost(FB.auth.uid).then(function(post){
        if(post != null){
          var ms = moment().diff(moment(post.time,"x"));
          if(ms < 3600000){
            ionicToast.show('Sorry you cannot report again for the next '+parseInt((3600000-ms)/60000)+' minutes', 'bottom', false, 3000);
            return -1;
          }
        }
        
        FB.push('/feed',{
          userid: FB.auth.uid,
          user: FB.userData.displayName,
          menu: hash,
          time: parseInt(moment().format('x')),
          present: $scope.input.toggle
        });
        
        $location.path('/report');
        ionicToast.show('Report Sent!', 'bottom', false, 3000);
        return 0;
      });
      
      
      
    };
    
    
  })
  
  .controller('menuCtrl', function(FB, $scope, ionicToast){
    $scope.user = 'nil';
    
    $scope.userData = null;
    
    $scope.input = {notifications : FB.isMsgEnabled()};
    
    $scope.$on('loggedIn', function(event) {
      console.log('logged in');
      $scope.user = FB.getAuthData();
      $scope.userData = FB.getUserData();
      console.log("Auth Data",$scope.user);
      ionicToast.show('Logged in as '+$scope.user.displayName, 'bottom', false, 3000);
    });
    
    $scope.$on('noAuth', function(event) {
      console.log('not logged in');
      $scope.user = null;
    });
    
    $scope.logout = function(){
      FB.logout();
      ionicToast.show('Logged Out!', 'bottom', false, 4000);
      $scope.user = null;
    };
    
    $scope.toggleNotifications = () => {
      if($scope.input.notifications){
        FB.enableMessaging(
          ()=>{
            console.log('notifications enabled');
          },
          ()=>{
            console.log('notifications not supported');
            $scope.input.notifications = false;
          }
        );
      }else{
        FB.deleteToken();
      }
    };
    
    $scope.LoginWithFacebook = function(){
      FB.FBlogin();
    };
    
  });
