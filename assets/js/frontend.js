var CategoryLayout, ColumnLayout, Event, EventView, Events, EventsApp, MapLayout, Tab, Tabs, ThirdColumnView;

EventsApp = new Marionette.Application({
  regions: {
    application: '.main-content'
  }
});

Event = Backbone.Model.extend({
  initialize: function() {
    return this.set('local_url', '/' + EventsApp.ops.evi_event_detail_page + '/?' + EventsApp.ops.evi_event_id_variable + '=' + this.get('ID'));
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
  template: function(attributes) {
    return _.template(EventsApp.ops.evi_event_template)(attributes);
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
      this.map = new google.maps.Map(EventsApp.map.el, {
        zoom: 4,
        center: new google.maps.LatLng(37.09024, -95.712891),
        scrollwheel: EventsApp.ops.evi_enable_scroll_wheel,
        mapTypeControlOptions: {
          mapTypeIds: [google.maps.MapTypeId.ROADMAP, 'map_style']
        }
      });
      if (!_.isEmpty(EventsApp.ops.evi_map_style)) {
        styledMap = new google.maps.StyledMapType(JSON.parse(EventsApp.ops.evi_map_style), {
          name: EventsApp.ops.evi_map_style_name
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
    if (EventsApp.ops.evi_marker_icon) {
      settings.icon = EventsApp.ops.evi_marker_icon;
    }
    this.markers.push((marker = new google.maps.Marker(settings)));
    return google.maps.event.addListener(marker, 'click', function() {
      return window.location.href = this.url;
    });
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
    return EventsApp.$.ajax("http://ipinfo.io", {
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
    var evs, myLocation;
    myLocation = new google.maps.LatLng(parseFloat(lat), parseFloat(lng));
    this.map.setCenter(myLocation);
    this.map.setZoom(6);
    if (EventsApp.nearby) {
      evs = new Events(_.sortBy(EventsApp.events_raw, function(ev) {

        /* ev.proximity = */
        return google.maps.geometry.spherical.computeDistanceBetween(myLocation, new google.maps.LatLng(ev.venue.latitude, ev.venue.longitude)) * 0.00062137;
      }));
      return EventsApp.nearby.show(new CategoryLayout({
        categories: {
          'Closest to Furthest': evs.models.slice(0, 3)
        }
      }));
    }
  }
});

EventsApp.addInitializer(function(options) {
  var grouped_byCity, grouped_byDate, r, region, _i, _len, _ref;
  this.ops = options;
  r = {};
  _ref = ['upcoming', 'alphabetical', 'nearby', 'map'];
  for (_i = 0, _len = _ref.length; _i < _len; _i++) {
    region = _ref[_i];
    if (EventsApp.$(options['evi_' + region + '_tag_id']).length > 0) {
      r[region] = options['evi_' + region + '_tag_id'];
    }
  }
  this.addRegions(r);
  this.events_raw = _.filter(options.events, function(ev) {
    return ev.organizer.id === options.evi_organizer_id;
  });
  this.events = {
    byDate: new Events(_.sortBy(this.events_raw, function(ev) {
      return ev.start.local;
    })),
    byCity: new Events(_.sortBy(this.events_raw, function(ev) {
      var att, v, _j, _len1, _ref1;
      att = ev;
      _ref1 = options.evi_alphabetical_event_attribute.split('.');
      for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
        v = _ref1[_j];
        att = att[v];
      }
      return att.substr(0, 1);
    })),
    noSort: new Events(this.events_raw)
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
  if (this.map) {
    return this.map.show(new MapLayout({
      evnts: this.events['noSort']
    }));
  }
});

jQuery(document).ready(function($) {
  EventsApp.$ = $;
  if (!_.isUndefined(data.events)) {
    return EventsApp.start(data.events);
  }
});

var Event, EventApp, EventDetails, EventLinks, EventView, Link, LinkList, Ticket, Tickets, TicketsView;

EventApp = new Marionette.Application;

Event = Backbone.Model.extend({
  initialize: function(attributes) {
    var mEnd, mStart, start;
    start = attributes.start;
    mStart = moment(start.local);
    mEnd = moment(attributes.end.local);
    start.formatted = mStart.format('dddd, MMMM Do, YYYY') + ' from ' + mStart.format('h:mm a') + ' to ' + mEnd.format('h:mm a zz');
    return this.set('start', start);
  }
});

EventView = Marionette.ItemView.extend({
  initialize: function(options) {
    if (options.template) {
      return this.template = options.template;
    }
  }
});


/* LINKING */

Link = Backbone.Model.extend({
  initialize: function(attributes) {
    return this.set('icon', '<i class="' + attributes.icon_name + '"></i>');
  }
});

LinkList = Backbone.Collection.extend({
  model: Link
});

EventLinks = Marionette.CollectionView.extend({
  className: 'event-buttons',
  childView: EventView,
  initialize: function(options) {
    if (options.template) {
      return this.template = options.template;
    }
  },
  onRender: function() {
    return this.$el.children().each(function(i, e) {
      var $link;
      return ($link = EventApp.$(e).find('a')).attr('onclick', "_gaq.push(['_link', '" + $link.attr('href') + "']); return false;");
    });
  },
  childViewOptions: function() {
    return {
      template: this.template
    };
  }
});


/* TICKETING */

Ticket = Backbone.Model.extend({
  initialize: function(attributes) {
    var sale_ends, two_weeks;
    if (attributes.free) {
      this.set('price', 'Free');
    } else {
      this.set('price', attributes.cost.display);
    }
    sale_ends = moment(attributes.sales_end);
    two_weeks = moment().add(2, 'weeks');
    if (sale_ends.isBefore(two_weeks)) {
      return this.set('timeleft', 'only ' + sale_ends.diff(moment(), 'days') + ' days left at this price');
    } else {
      return this.set('timeleft', 'until ' + sale_ends.format('MMMM Do YYYY'));
    }
  }
});

Tickets = Backbone.Collection.extend({
  model: Ticket
});

TicketsView = Marionette.CollectionView.extend({
  childView: EventView,
  initialize: function(options) {
    if (options.template) {
      return this.template = options.template;
    }
  },
  childViewOptions: function() {
    return {
      template: this.template
    };
  }
});

EventApp.showRegForm = function() {
  return EventApp.$('.eventbrite-event-private').each(function(i, e) {
    return EventApp.$(e).show();
  });
};

EventApp.showPublicDetails = function() {
  return EventApp.$('.eventbrite-event-public').each(function(i, e) {
    return EventApp.$(e).show();
  });
};

EventApp.displayLinks = function(ev) {
  return this.event_links.$el.each(function(i, e) {
    return EventApp.$(e).html((new EventLinks({
      collection: new LinkList([
        {
          url: ev.get('url') + '?team_reg_type=individual',
          icon_name: 'icomoon-user',
          text: 'Participate as an individual'
        }, {
          url: ev.get('url') + '#team-search',
          icon_name: 'icomoon-users',
          text: 'Join a team'
        }, {
          url: ev.get('url') + '#team-create',
          icon_name: 'icomoon-plus',
          text: 'Create a team'
        }, {
          url: 'https://www.eventbrite.com/mytickets/',
          icon_name: 'icomoon-cog',
          text: 'Manage your team'
        }
      ]),
      template: function(attributes) {
        return Handlebars.compile(EventApp.$(e).html())(attributes) + '<br />';
      }
    })).render().el);
  });
};


/* Settings */

EventDetails = Marionette.ItemView.extend({});

EventApp.displayTickets = function(ev) {
  return this.event_tickets.$el.each(function(i, e) {
    return EventApp.$(e).html((new TicketsView({
      collection: new Tickets(ev.get('tickets').filter(function(ticket) {
        return moment(ticket.sales_start).isBefore(moment().add(2, 'weeks'), 'day');
      })),
      template: function(attributes) {
        return Handlebars.compile(EventApp.$(e).html())(attributes) + '<br />';
      }
    })).render().el);
  });
};

EventApp.displayWhenWhere = function(ev) {
  return this.event_when_where.$el.each(function(i, e) {
    return EventApp.$(e).html((new EventView({
      model: ev,
      template: function(attributes) {
        return Handlebars.compile(EventApp.$(e).html())(attributes);
      }
    })).render().el);
  });
};

EventApp.displaySettings = function(ev) {
  return this.event_settings.$el.each(function(i, e) {
    return EventApp.$(e).html((new EventDetails({
      model: ev,
      template: function(attributes) {
        return Handlebars.compile(EventApp.$(e).html())(attributes);
      }
    })).render().el);
  });
};

EventApp.drawMap = function(ev) {
  var location;
  location = new google.maps.LatLng(ev.get('venue').latitude, ev.get('venue').longitude);
  return this.map.$el.each(function(i, e) {
    var map, settings, styledMap;
    map = new google.maps.Map(e, {
      zoom: 11,
      center: location,
      scrollwheel: EventApp.ops.evi_enable_scroll_wheel,
      mapTypeControlOptions: {
        mapTypeIds: [google.maps.MapTypeId.ROADMAP, 'map_style']
      }
    });
    if (!_.isEmpty(EventApp.ops.evi_map_style)) {
      styledMap = new google.maps.StyledMapType(JSON.parse(EventApp.ops.evi_map_style), {
        name: EventApp.ops.evi_map_style_name
      });
      map.mapTypes.set('map_style', styledMap);
      map.setMapTypeId('map_style');
    }
    settings = {
      map: map,
      position: location,
      animation: google.maps.Animation.DROP
    };
    if (EventApp.ops.evi_marker_icon) {
      settings.icon = EventApp.ops.evi_marker_icon;
    }
    return new google.maps.Marker(settings);
  });
};

EventApp.addInitializer(function(options) {
  var ev, r, region, _i, _len, _ref;
  this.ops = options;
  r = {};
  _ref = ['event_links', 'event_tickets', 'event_when_where', 'map', 'event_settings'];
  for (_i = 0, _len = _ref.length; _i < _len; _i++) {
    region = _ref[_i];
    if (EventApp.$(options['evi_' + region + '_tag_id']).length > 0) {
      r[region] = options['evi_' + region + '_tag_id'];
    }
  }
  this.addRegions(r);
  ev = new Event(options.event);
  if (_.isEmpty(options.event.ID)) {
    EventApp.$('.subheader').html("").prev().html("");
    if (confirm("Unable to Find event, click 'OK' to view all locations,\n click 'CANCEL' to refresh the page.")) {
      window.location.replace('/locations');
    } else {
      window.location.reload();
    }
    return;
  }
  EventApp.$('.subheader').html(moment(ev.get('start').local).format('MMMM Do, YYYY')).prev().html(ev.get('venue').address.city + ", " + ev.get('venue').address.region);
  if (this.event_when_where) {
    this.displayWhenWhere(ev);
  }
  if (this.event_settings) {
    this.displaySettings(ev);
  }
  if (this.map) {
    this.drawMap(ev);
  }
  if (ev.get('public')) {
    this.showPublicDetails();
    if (this.event_links) {
      this.displayLinks(ev);
    }
    if (this.event_tickets) {
      return this.displayTickets(ev);
    }
  } else {
    return this.showRegForm();
  }
});

jQuery(document).ready(function($) {
  EventApp.$ = $;
  if (!_.isUndefined(data.event)) {
    return EventApp.start(data.event);
  }
});
