var EventApp, EventDetails, EventLinks, EventModel, EventView, Link, LinkList, Ticket, Tickets, TicketsView;

EventApp = new Marionette.Application;

EventModel = Backbone.Model.extend({
  initialize: function(attributes) {
    var expr, mEnd, mStart, match, start;
    start = attributes.start;
    mStart = moment(start.local);
    mEnd = moment(attributes.end.local);
    start.formatted = mStart.format('dddd, MMMM Do, YYYY') + ' from ' + mStart.format('h:mm a') + ' to ' + mEnd.format('h:mm a zz');
    this.set('start', start);
    this.set('url', this.get('url').replace('http:', 'https:'));
    if (EventApp.ops.evi_event_metro_regex) {
      expr = new RegExp(EventApp.ops.evi_event_metro_regex);
      match = this.get('post_title').match(expr);
      return this.set('metro', ((match != null) && (match[1] != null) ? match[1] : this.get('venue').address.city));
    }
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
    var a_day, difference, sale_ends, two_weeks;
    if (attributes.free) {
      this.set('price', 'Free');
    } else {
      this.set('price', attributes.cost.display);
    }
    sale_ends = moment(attributes.sales_end);
    two_weeks = moment().add(2, 'weeks');
    a_day = moment().add(24, 'hours');
    console.log(moment());
    if (sale_ends.isBefore(two_weeks)) {
      this.set('timeleft', 'only ' + sale_ends.diff(moment(), 'days') + ' days left at this price');
    }
    if (sale_ends.isBefore(a_day)) {
      difference = sale_ends.diff(moment(), 'hours');
      return this.set('timeleft', 'only ' + difference + ' hour' + (difference === 1 ? '' : 's') + ' left at this price');
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
        return moment().isBetween(moment(ticket.sales_start).subtract(2, 'weeks'), moment(ticket.sales_end), 'minute');
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
  ev = new EventModel(options.event);
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

jQuery(document).on('load-event', function(e, options) {
  if (options == null) {
    options = {};
  }
  EventApp.$ = jQuery;
  return EventApp.start(options);
});
