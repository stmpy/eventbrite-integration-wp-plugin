var Event, Events, Ticket, Tickets;

Event = Backbone.Model.extend({
  initialize: function(attributes, options) {
    var allTickets, expr, mEnd, mStart, match, metro, raceDayTicket, start, tickets;
    if (options.evi_event_detail_page != null) {
      this.set('local_url', '/' + options.evi_event_detail_page + '/?' + options.evi_event_id_variable + '=' + this.get('ID'));
    }
    allTickets = this.get('tickets');
    raceDayTicket = new Ticket(_.max(allTickets, function(ticket) {
      return new Date(ticket.sales_end);
    }));
    tickets = new Tickets(_.filter(allTickets, function(ticket) {
      return !ticket.hidden && (moment().isBetween(moment(ticket.sales_start), moment(ticket.sales_end), 'minute') || moment(ticket.sales_end).isSame(moment(raceDayTicket.get('sales_end')), 'day'));
    }), {
      raceDayTicket: raceDayTicket
    });
    this.set('tickets', tickets);
    this.set('soldout', tickets.some(function(ticket) {
      return ticket.get('quantity_sold') >= ticket.get('quantity_total');
    }));
    start = attributes.start;
    mStart = moment(start.local);
    mEnd = moment(attributes.end.local);
    start.formatted = mStart.format('dddd, MMMM Do, YYYY') + ' from ' + mStart.format('h:mm a') + ' to ' + mEnd.format('h:mm a zz');
    this.set('start', start);
    this.set('url', this.get('url').replace('http:', 'https:'));
    expr = new RegExp(options.evi_event_metro_regex);
    match = this.get('post_title').match(expr);
    metro = ((match != null) && (match[1] != null) ? match[1] : this.get('venue').address.city);
    return this.set('metro', metro);
  }
});

Ticket = Backbone.Model.extend({
  initialize: function(attributes, options) {
    var a_day, an_hour, difference, sale_ends, two_weeks;
    if (options == null) {
      options = {};
    }
    if (attributes.free) {
      this.set('price', 'Free');
    } else {
      this.set('price', (attributes.cost != null ? attributes.cost.display : 'TBD'));
    }
    sale_ends = moment(attributes.sales_end);
    two_weeks = moment().add(2, 'weeks');
    a_day = moment().add(24, 'hours');
    an_hour = moment().add(60, 'minutes');
    if (sale_ends.isBefore(an_hour)) {
      difference = sale_ends.diff(moment(), 'minutes');
      this.set('timeleft', 'only ' + difference + ' minute' + (difference === 1 ? '' : 's') + ' left at this price');
    } else if (sale_ends.isBefore(a_day)) {
      difference = sale_ends.diff(moment(), 'hours');
      this.set('timeleft', 'only ' + difference + ' hour' + (difference === 1 ? '' : 's') + ' left at this price');
    } else if (sale_ends.isBefore(two_weeks)) {
      this.set('timeleft', 'only ' + sale_ends.diff(moment(), 'days') + ' days left at this price');
    } else {
      this.set('timeleft', 'until ' + sale_ends.format('MMMM Do YYYY'));
    }
    if (options.raceDayTicket != null) {
      this.set('raceDayTicket', moment(options.raceDayTicket.get('sales_end')).isSame(moment(attributes.sales_end), 'day'));
    }
    return this.set('sort', parseInt(moment(attributes.sales_end).diff(moment(attributes.sales_start))) / 10000 + (parseInt(moment(attributes.sales_end).format("X")) * 10));
  }
});

Events = Backbone.Collection.extend({
  model: Event
});

Tickets = Backbone.Collection.extend({
  model: Ticket,
  comparator: 'sort'
});

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

var EventApp, EventDetails, EventLinks, EventView, Link, LinkList, TicketsView;

EventApp = new Marionette.Application;

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
  return EventApp.$(EventApp.ops.evi_event_private_class).each(function(i, e) {
    return EventApp.$(e).show();
  });
};

EventApp.showPublicDetails = function() {
  return EventApp.$(EventApp.ops.evi_event_public_class).each(function(i, e) {
    return EventApp.$(e).show();
  });
};

EventApp.showSoldOutForm = function() {
  return EventApp.$(EventApp.ops.evi_event_sold_out_class).each(function(i, e) {
    return EventApp.$(e).show();
  });
};

EventApp.renderTemplates = function(ev) {
  return EventApp.$(EventApp.ops.evi_event_template_class).each(function(i, e) {
    return EventApp.$(e).html(Handlebars.compile(EventApp.$(e).html())(ev.toJSON()));
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
          text: 'Manage your orders'
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
      collection: ev.get('tickets'),
      template: function(attributes) {
        return Handlebars.compile(EventApp.$(e).html())(_.extend(attributes, {
          event: ev.toJSON()
        })) + '<br />';
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
  ev = new Event(options.event, this.ops);
  if (_.isEmpty(options.event.ID)) {
    EventApp.$('.subheader').html("").prev().html("");
    if (confirm("Unable to Find event, click 'OK' to view all locations,\n click 'CANCEL' to refresh the page.")) {
      window.location.replace('/locations');
    } else {
      window.location.reload();
    }
    return;
  }
  EventApp.$('.subheader').html(moment(ev.get('start').local).format('MMMM Do, YYYY')).prev().html(ev.get('metro'));
  if (this.event_when_where) {
    this.displayWhenWhere(ev);
  }
  if (this.event_settings) {
    this.displaySettings(ev);
  }
  if (this.map) {
    this.drawMap(ev);
  }
  this.renderTemplates(ev);
  if (ev.get('soldout')) {
    return this.showSoldOutForm();
  } else if (ev.get('public')) {
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

jQuery(document).on('load-event', function(e, options) {
  if (options == null) {
    options = {};
  }
  EventApp.$ = jQuery;
  return EventApp.start(options);
});
