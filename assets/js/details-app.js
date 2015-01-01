var App, Event, EventDetails, EventLinks, EventView, Link, LinkList, NoEvent, Ticket, Tickets, TicketsView;

App = new Marionette.Application;

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
  childViewOptions: function() {
    return {
      template: this.template
    };
  }
});

NoEvent = Marionette.ItemView.extend({
  template: Handlebars.compile('<h3>Unable to Find event please refresh the page or try again.</h3>')
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

App.hideRegForm = function() {
  return jQuery('.eventbrite-event-private').each(function(i, e) {
    return jQuery(e).hide();
  });
};

App.hidePublicDetails = function() {
  return jQuery('.eventbrite-event-public').each(function(i, e) {
    return jQuery(e).hide();
  });
};

App.displayLinks = function(ev) {
  this.event_links.$el.each(function(i, e) {
    return jQuery(e).html((new EventLinks({
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
        return Handlebars.compile(jQuery(e).html())(attributes) + '<br />';
      }
    })).render().el);
  });
  return this.hideRegForm();
};


/* Settings */

EventDetails = Marionette.ItemView.extend({});

App.displayTickets = function(ev) {
  return this.event_tickets.$el.each(function(i, e) {
    return jQuery(e).html((new TicketsView({
      collection: new Tickets(ev.get('tickets').filter(function(ticket) {
        return moment(ticket.sales_start).isBefore(moment().add(2, 'weeks'), 'day');
      })),
      template: function(attributes) {
        return Handlebars.compile(jQuery(e).html())(attributes) + '<br />';
      }
    })).render().el);
  });
};

App.displayWhenWhere = function(ev) {
  return this.event_when_where.$el.each(function(i, e) {
    return jQuery(e).html((new EventView({
      model: ev,
      template: function(attributes) {
        return Handlebars.compile(jQuery(e).html())(attributes);
      }
    })).render().el);
  });
};

App.displaySettings = function(ev) {
  return this.event_settings.$el.each(function(i, e) {
    return jQuery(e).html((new EventDetails({
      model: ev,
      template: function(attributes) {
        return Handlebars.compile(jQuery(e).html())(attributes);
      }
    })).render().el);
  });
};

App.drawMap = function(ev) {
  var location;
  location = new google.maps.LatLng(ev.get('venue').latitude, ev.get('venue').longitude);
  return this.map.$el.each(function(i, e) {
    var map, settings, styledMap;
    map = new google.maps.Map(e, {
      zoom: 11,
      center: location,
      scrollwheel: App.ops.evi_enable_scroll_wheel,
      mapTypeControlOptions: {
        mapTypeIds: [google.maps.MapTypeId.ROADMAP, 'map_style']
      }
    });
    if (!_.isEmpty(App.ops.evi_map_style)) {
      styledMap = new google.maps.StyledMapType(JSON.parse(App.ops.evi_map_style), {
        name: App.ops.evi_map_style_name
      });
      map.mapTypes.set('map_style', styledMap);
      map.setMapTypeId('map_style');
    }
    settings = {
      map: map,
      position: location,
      animation: google.maps.Animation.DROP
    };
    if (App.ops.evi_marker_icon) {
      settings.icon = App.ops.evi_marker_icon;
    }
    return new google.maps.Marker(settings);
  });
};

App.addInitializer(function(options) {
  var ev, r, region, _i, _len, _ref;
  this.ops = options;
  r = {};
  _ref = ['event_links', 'event_tickets', 'event_when_where', 'map', 'event_settings'];
  for (_i = 0, _len = _ref.length; _i < _len; _i++) {
    region = _ref[_i];
    if (jQuery(options['evi_' + region + '_tag_id']).length > 0) {
      r[region] = options['evi_' + region + '_tag_id'];
    }
  }
  this.addRegions(r);
  ev = new Event(options.event);
  if (_.isEmpty(options.event.ID)) {
    this.hideRegForm();
    this.event_links.show(new NoEvent);
    return;
  }
  jQuery('.subheader').html(moment(ev.get('start').local).format('MMMM Do, YYYY')).prev().html(ev.get('venue').address.city + ", " + ev.get('venue').address.region);
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
    this.hideRegForm();
    if (this.event_links) {
      this.displayLinks(ev);
    }
    if (this.event_tickets) {
      return this.displayTickets(ev);
    }
  } else {
    return this.hidePublicDetails();
  }
});
