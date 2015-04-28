var CategoryLayout, ColumnLayout, EventListApp, EventView, MapLayout, ThirdColumnView;

EventListApp = new Marionette.Application({
  regions: {
    application: '.main-content'
  }
});

EventView = Marionette.ItemView.extend({
  className: 'eventbrite-event',
  template: function(attributes) {
    return _.template(EventListApp.ops.evi_event_template)(attributes);
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
        collection: new Events(group, EventListApp.ops)
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
      return self.$el.append("<div class='vc_row-fluid'><div class='vc_span12 col'><h4 class='eventbrite-category-title'>" + category + "</h4></div></div>", (new ColumnLayout({
        column_count: 3,
        columns: _.groupBy(group, function(event, i) {
          return parseInt((i % 3) + 1);
        })
      })).render().el);
    });
  }
});

MapLayout = Marionette.LayoutView.extend({
  template: _.template(''),
  className: 'eventbrite-list-map row',
  markers: [],
  onRender: function() {
    var self, styledMap;
    self = this;
    if (_.isUndefined(this.map)) {
      this.map = new google.maps.Map(EventListApp.map.el, {
        zoom: 4,
        center: new google.maps.LatLng(37.09024, -95.712891),
        scrollwheel: EventListApp.ops.evi_enable_scroll_wheel,
        mapTypeControlOptions: {
          mapTypeIds: [google.maps.MapTypeId.ROADMAP, 'map_style']
        }
      });
      if (!_.isEmpty(EventListApp.ops.evi_map_style)) {
        styledMap = new google.maps.StyledMapType(JSON.parse(EventListApp.ops.evi_map_style), {
          name: EventListApp.ops.evi_map_style_name
        });
        this.map.mapTypes.set('map_style', styledMap);
        this.map.setMapTypeId('map_style');
      }
    }
    this._geoLocate();
    this.getOption('evnts').each(function(event) {
      return self.drawMarker(new google.maps.LatLng(parseFloat(event.get('venue').latitude), parseFloat(event.get('venue').longitude)), event.get('local_url'));
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
  drawMarker: function(location, url) {
    var marker, settings;
    if (url == null) {
      url = null;
    }
    settings = {
      map: this.map,
      position: location,
      animation: google.maps.Animation.DROP
    };
    if (url) {
      settings.url = url;
    }
    if (EventListApp.ops.evi_marker_icon) {
      settings.icon = EventListApp.ops.evi_marker_icon;
    }
    this.markers.push((marker = new google.maps.Marker(settings)));
    return google.maps.event.addListener(marker, 'click', function() {
      return window.location.href = this.url;
    });
  },
  _geoLocate: function() {
    var self;
    if (_.isUndefined(navigator.geolocation.getCurrentPosition)) {
      return this._ipLocate();
    } else {
      self = this;
      if (store.get('geolocate:lat') && store.get('geolocate:lng')) {
        return this._setMyLocation(store.get('geolocate:lat'), store.get('geolocate:lng'), false);
      } else {
        return navigator.geolocation.getCurrentPosition(function(position) {
          return self._setMyLocation(position.coords.latitude, position.coords.longitude);
        }, function(error) {
          return self._ipLocate();
        });
      }
    }
  },
  _ipLocate: function() {
    return EventListApp.$.ajax("http://ipinfo.io" + (_.isEmpty(EventListApp.ops.evi_ipinfo_token) ? "" : "?token=" + EventListApp.ops.evi_ipinfo_token), {
      context: this,
      success: function(location) {
        var lat_lng;
        lat_lng = location.loc.split(',');
        return this._setMyLocation(lat_lng[0], lat_lng[1]);
      },
      dataType: "jsonp"
    });
  },
  _setMyLocation: function(lat, lng, update) {
    var evs, myLocation;
    if (update == null) {
      update = true;
    }
    if (update) {
      store.set('geolocate:lat', parseFloat(lat));
      store.set('geolocate:lng', parseFloat(lng));
    }
    myLocation = new google.maps.LatLng(parseFloat(lat), parseFloat(lng));
    this.map.setCenter(myLocation);
    this.map.setZoom(6);
    if (EventListApp.nearby) {
      evs = new Events(EventListApp.events.noSort.sortBy(function(ev) {

        /* ev.proximity = */
        return google.maps.geometry.spherical.computeDistanceBetween(myLocation, new google.maps.LatLng(ev.get('venue').latitude, ev.get('venue').longitude)) * 0.00062137;
      }, EventListApp.ops));
      return EventListApp.nearby.show(new CategoryLayout({
        categories: {
          'Closest to Furthest': evs.models.slice(0, 3)
        }
      }));
    }
  }
});

EventListApp.addInitializer(function(options) {
  var evs, grouped_byCity, grouped_byDate, r, region, _i, _len, _ref;
  this.ops = options;
  r = {};
  _ref = ['upcoming', 'alphabetical', 'nearby', 'map'];
  for (_i = 0, _len = _ref.length; _i < _len; _i++) {
    region = _ref[_i];
    if (EventListApp.$(options['evi_' + region + '_tag_id']).length > 0) {
      r[region] = options['evi_' + region + '_tag_id'];
    }
  }
  this.addRegions(r);
  this.events_raw = _.filter(options.events, function(ev) {
    return ev.organizer.id === options.evi_organizer_id && !ev.post_title.match(/cancel/i);
  });
  evs = new Events(this.events_raw, EventListApp.ops);
  this.events = {
    byDate: new Events(evs.sortBy(function(ev) {
      return ev.get('start').local;
    }, EventListApp.ops)),
    byCity: new Events(evs.sortBy(function(ev) {
      var att, v, _j, _len1, _ref1;
      att = ev.attributes;
      if (options.evi_alphabetical_event_attribute.indexOf('.') > -1) {
        _ref1 = options.evi_alphabetical_event_attribute.split('.');
        for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
          v = _ref1[_j];
          att = att[v];
        }
        return att;
      } else {
        return att[options.evi_alphabetical_event_attribute];
      }
    }, EventListApp.ops)),
    noSort: evs
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
    if (options.evi_alphabetical_event_attribute.indexOf('.') > -1) {
      _ref1 = options.evi_alphabetical_event_attribute.split('.');
      for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
        v = _ref1[_j];
        att = att[v];
      }
      return att;
    } else {
      return att[options.evi_alphabetical_event_attribute];
    }
  });
  if (this.alphabetical) {
    this.alphabetical.show(new CategoryLayout({
      categories: grouped_byCity
    }));
  }
  if (this.map) {
    return this.map.show(new MapLayout({
      evnts: this.events['noSort']
    }));
  }
});

jQuery(document).on('load-events', function(e, options) {
  if (options == null) {
    options = {};
  }
  EventListApp.$ = jQuery;
  return EventListApp.start(options);
});
