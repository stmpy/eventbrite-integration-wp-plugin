var App, CategoryLayout, ColumnLayout, Controller, Event, EventView, Events, MapLayout, Tab, TabView, Tabs, TabsView, ThirdColumnView;

App = new Marionette.Application({
  regions: {
    application: '.main-content'
  }
});

Event = Backbone.Model.extend({
  initialize: function() {
    console.log('initing a model');
    console.log(this.attributes);
    this.set('local_url', '/' + App.ops.evi_event_detail_page + '/?' + App.ops.evi_event_id_variable + '=' + this.get('ID'));
    return console.log(this.get('local_url'));
  }
});

Events = Backbone.Collection.extend({
  model: Event
});

Tab = Backbone.Model.extend({});

Tabs = Backbone.Collection.extend({
  model: Tab
});

TabView = Marionette.ItemView.extend({});

TabsView = Marionette.CollectionView.extend({
  events: {
    'click li > a': 'ohHell'
  },
  ohHell: function(event) {
    var tab;
    tab = this.collection.findWhere({
      tab_id: this.$(event.currentTarget).attr('href')
    });
    if (tab.get('activated')) {
      return;
    }
    tab.set('activated', true);
    return App.controller[tab.get('param')]();
  },
  initialize: function() {
    var self;
    self = this;
    return this.$el.find('li > a').each(function(i, el) {
      var $content, $tab, action, eventbrite, param, region, tab, _ref;
      $tab = self.$(el);
      $content = self.$($tab.attr('href')).find('[id^=eventbrite]');
      _ref = $content.attr('id').split('-', 3), eventbrite = _ref[0], action = _ref[1], param = _ref[2];
      tab = new Tab({
        name: $tab.html(),
        tab_id: $tab.attr('href'),
        action: action,
        param: param,
        content: $content.attr('id'),
        activated: false
      });
      self.collection.add(tab);
      region = {};
      region[tab.get('param')] = '#' + tab.get('content');
      return App.addRegions(region);
    });
  }
});

EventView = Marionette.ItemView.extend({
  className: 'eventbrite-event',
  template: function(model) {
    return _.template(App.ops.evi_event_template)(model);
  }
});

ThirdColumnView = Marionette.CollectionView.extend({
  className: 'vc_span4 wpb_column column_container col no-extra-padding',
  childView: EventView
});

ColumnLayout = Marionette.LayoutView.extend({
  className: 'vc_row-fluid',
  regions: {
    column1: '#column1',
    column2: '#column2',
    column3: '#column3'
  },
  template: _.template(''),
  _mapping: {
    '3': ThirdColumnView
  },
  onRender: function() {
    var columnView, self;
    self = this;
    columnView = this._mapping[this.getOption('column_count')];
    return _.each(this.getOption('columns'), function(group, i) {
      return self.$el.append((new columnView({
        collection: new Events(group)
      })).render().el);
    });
  }
});

CategoryLayout = Marionette.LayoutView.extend({
  template: _.template(''),
  onRender: function() {
    var self;
    self = this;
    return _.each(this.getOption('categories'), function(group, category) {
      return self.$el.prepend("<div class='vc_row-fluid'><div class='vc_span12 col'><h4 class='eventbrite-category-title'>" + category + "</h4></div></div>", (new ColumnLayout({
        column_count: 3,
        columns: _.groupBy(group, function(event, i) {
          return parseInt(i / (group.length / 3));
        })
      })).render().el);
    });
  }
});

MapLayout = Marionette.LayoutView.extend({
  template: _.template('<div id="map-canvas" class="google-map-large vc_span12 col"></div>'),
  className: 'eventbrite-list-map row',
  markers: [],
  onRender: function() {
    var self, styledMap, styles;
    self = this;
    styles = [
      {
        stylers: [
          {
            hue: "#dfecf1"
          }, {
            saturation: 40
          }
        ]
      }, {
        featureType: "road",
        elementType: "geometry",
        stylers: [
          {
            lightness: 100
          }, {
            visibility: "simplified"
          }
        ]
      }, {
        featureType: "road",
        elementType: "labels",
        stylers: [
          {
            visibility: "off"
          }
        ]
      }
    ];
    if (_.isUndefined(this.map)) {
      styledMap = new google.maps.StyledMapType(styles, {
        name: "color me rad"
      });
      this.map = new google.maps.Map(this.$('#map-canvas')[0], {
        zoom: 4,
        center: new google.maps.LatLng(37.09024, -95.712891),
        mapTypeControlOptions: {
          mapTypeIds: [google.maps.MapTypeId.ROADMAP, 'map_style']
        }
      });
      this.map.mapTypes.set('map_style', styledMap);
      this.map.setMapTypeId('map_style');
    }
    this._geoLocate();
    return this.getOption('evnts').each(function(event) {
      return self.drawMarker(new google.maps.LatLng(parseFloat(event.get('venue').latitude), parseFloat(event.get('venue').longitude)));
    });
  },
  drawMarker: function(location) {
    return this.markers.push(new google.maps.Marker({
      map: this.map,
      position: location,
      animation: google.maps.Animation.DROP
    }));
  },
  _geoLocate: function() {
    var self;
    if (!_.isUndefined(navigator.geolocation.getCurrentPosition)) {
      self = this;
      return navigator.geolocation.getCurrentPosition(function(position) {
        return self._setMyLocation(position.coords.latitude, position.coords.longitude);
      }, function(error) {
        return self._ipLocate();
      });
    }
  },
  _ipLocate: function() {
    return jQuery.ajax("http://ipinfo.io", {
      context: this,
      success: function(location) {
        var lat_lng;
        lat_lng = location.loc.split(',');
        return this._setMyLocation(parseFloat(lat_lng[0]), parseFloat(lat_lng[1]));
      },
      dataType: "jsonp"
    });
  },
  _setMyLocation: function(lat, lng) {
    var myLocation;
    myLocation = new google.maps.LatLng(parseFloat(lat), parseFloat(lng));
    this.map.setCenter(myLocation);
    return this.map.setZoom(8);
  }
});

Controller = Marionette.Controller.extend({
  upcoming: function() {
    var grouped_byDate;
    grouped_byDate = App.events['byDate'].groupBy(function(ev, i) {
      return moment(ev.get('start').local).format("MMMM YYYY");
    });
    return App.upcoming.show(new CategoryLayout({
      categories: grouped_byDate
    }));
  },
  alphabetical: function() {
    var grouped_byCity;
    grouped_byCity = App.events['byDate'].groupBy(function(ev, i) {
      return ev.get('venue').address.city.substr(0, 1);
    });
    return App.alphabetical.show(new CategoryLayout({
      categories: grouped_byCity
    }));
  },
  nearby: function() {
    return App.nearby.show(new MapLayout({
      evnts: App.events['noSort']
    }));
  }
});

App.addInitializer(function(options) {
  var events;
  this.ops = options;
  events = _.filter(options.events, function(ev) {
    return ev.organizer.id === options.evi_organizer_id;
  });
  this.events = {
    byDate: new Events(_.sortBy(events, function(ev) {
      return ev.start.local;
    })),
    byCity: new Events(_.sortBy(events, function(ev) {
      return -ev.venue.address.city.substr(0, 1);
    })),
    noSort: new Events(events)
  };
  this.controller = new Controller;
  return new TabsView({
    el: '.tabbed',
    collection: new Tabs
  });
});
