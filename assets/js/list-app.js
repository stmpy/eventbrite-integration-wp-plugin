var App, CategoryLayout, ColumnLayout, Event, EventView, Events, MapLayout, Tab, Tabs, ThirdColumnView;

App = new Marionette.Application({
  regions: {
    application: '.main-content'
  }
});

Event = Backbone.Model.extend({
  initialize: function() {
    return this.set('local_url', '/' + App.ops.evi_event_detail_page + '/?' + App.ops.evi_event_id_variable + '=' + this.get('ID'));
  }
});

Events = Backbone.Collection.extend({
  model: Event
});

Tab = Backbone.Model.extend({});

Tabs = Backbone.Collection.extend({
  model: Tab
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
    this.getOption('evnts').each(function(event) {
      return self.drawMarker(new google.maps.LatLng(parseFloat(event.get('venue').latitude), parseFloat(event.get('venue').longitude)));
    });
    google.maps.event.addListenerOnce(this.map, 'tilesloaded', function() {
      return google.maps.event.addListenerOnce(self.map, 'tilesloaded', function() {
        return google.maps.event.trigger(self.map, 'resize');
      });
    });
    return google.maps.event.addListenerOnce(this.map, 'resize', function() {
      return self._geoLocate();
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

App.addInitializer(function(options) {
  var events, grouped_byCity, grouped_byDate, r, region, _i, _len, _ref;
  this.ops = options;
  r = {};
  _ref = ['upcoming', 'alphabetical', 'nearby'];
  for (_i = 0, _len = _ref.length; _i < _len; _i++) {
    region = _ref[_i];
    if (jQuery(options['evi_' + region + '_tag_id']).length > 0) {
      r[region] = options['evi_' + region + '_tag_id'];
    }
  }
  this.addRegions(r);
  events = _.filter(options.events, function(ev) {
    return ev.organizer.id === options.evi_organizer_id;
  });
  this.events = {
    byDate: new Events(_.sortBy(events, function(ev) {
      return ev.start.local;
    })),
    byCity: new Events((_.sortBy(events, function(ev) {
      var att, v, _j, _len1, _ref1;
      att = ev;
      _ref1 = options.evi_alphabetical_event_attribute.split('.');
      for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
        v = _ref1[_j];
        att = att[v];
      }
      return att.substr(0, 1);
    })).reverse()),
    noSort: new Events(events)
  };
  grouped_byDate = this.events['byDate'].groupBy(function(ev, i) {
    return moment(ev.get('start').local).format("MMMM YYYY");
  });
  if (this.upcoming) {
    this.upcoming.show(new CategoryLayout({
      categories: grouped_byDate
    }));
  }
  grouped_byCity = this.events['byCity'].groupBy(function(ev, i) {
    var att, v, _j, _len1, _ref1;
    att = ev.attributes;
    _ref1 = options.evi_alphabetical_event_attribute.split('.');
    for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
      v = _ref1[_j];
      att = att[v];
    }
    return att;
  });
  if (this.alphabetical) {
    this.alphabetical.show(new CategoryLayout({
      categories: grouped_byCity
    }));
  }
  if (this.nearby) {
    return this.nearby.show(new MapLayout({
      evnts: this.events['noSort']
    }));
  }
});
