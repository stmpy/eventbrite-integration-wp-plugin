var App, Event, EventLinks, Link, LinkList, LinkView, NoEvent, Ticket, TicketView, Tickets, TicketsView, WhenWhereView;

App = new Marionette.Application;

Event = Backbone.Model.extend({
  initialize: function(attributes) {
    var mEnd, mStart, start;
    start = attributes.start;
    mStart = moment(start.local);
    mEnd = moment(attributes.end.local);
    start.formatted = mStart.format('dddd, MMMM Mo, YYYY') + ' from ' + mStart.format('h:mm a') + ' to ' + mEnd.format('h:mm a zz');
    return this.set('start', start);
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

LinkView = Marionette.ItemView.extend({
  template: function(attributes) {
    return Handlebars.compile(jQuery(App.links.el).html())(attributes) + '<br />';
  }
});

EventLinks = Marionette.CollectionView.extend({
  className: 'event-buttons',
  childView: LinkView
});

NoEvent = Marionette.ItemView.extend({
  template: Handlebars.compile('<h3>Unable to Find event please refresh the page or try again.</h3>')
});


/* TICKETING */

Ticket = Backbone.Model.extend({
  initialize: function(attributes) {
    var sale_ends, two_weeks;
    console.log(attributes);
    if (attributes.free) {
      this.set('price', 'Free');
    } else {
      this.set('price', attributes.actual_cost.display);
    }
    sale_ends = moment(attributes.sales_end);
    two_weeks = moment().add(2, 'weeks');
    if (sale_ends.isBefore(two_weeks)) {
      return this.set('timeleft', 'only ' + two_weeks.diff(sale_ends, 'days') + ' days left at this price');
    } else {
      return this.set('timeleft', 'until ' + sale_ends.format('MMMM Mo YYYY'));
    }
  }
});

Tickets = Backbone.Collection.extend({
  model: Ticket
});

TicketView = Marionette.ItemView.extend({
  template: function(attributes) {
    return Handlebars.compile(jQuery(App.tickets.el).html())(attributes) + '<br />';
  }
});

TicketsView = Marionette.CollectionView.extend({
  childView: TicketView
});


/* When Where */

WhenWhereView = Marionette.ItemView.extend({
  template: function(attributes) {
    console.log(attributes);
    return Handlebars.compile(jQuery(App.when_where.el).html())(attributes);
  }
});

App.hideRegForm = function() {
  return jQuery('.main-content form').parent().hide();
};

App.displayLinks = function(ev) {
  if (ev.get('public')) {
    this.links.show(new EventLinks({
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
      ])
    }));
    return this.hideRegForm();
  }
};

App.displayTickets = function(ev) {
  if (this.tickets) {
    return this.tickets.show(new TicketsView({
      collection: new Tickets(ev.get('tickets'))
    }));
  }
};

App.displayWhenWhere = function(ev) {
  if (this.when_where) {
    this.drawMap(ev);
    return this.when_where.show(new WhenWhereView({
      model: ev
    }));
  }
};

App.drawMap = function(ev) {
  var location, map, settings, styledMap;
  location = new google.maps.LatLng(ev.get('venue').latitude, ev.get('venue').longitude);
  map = new google.maps.Map(jQuery('#map-canvas')[0], {
    zoom: 11,
    center: location,
    scrollwheel: App.ops.evi_enable_scroll_wheel,
    mapTypeControlOptions: {
      mapTypeIds: [google.maps.MapTypeId.ROADMAP, 'map_style']
    }
  });
  if (!_.isEmpty(App.ops.evi_map_style)) {
    styledMap = new google.maps.StyledMapType(JSON.parse(App.ops.evi_map_style), {
      name: "color me rad"
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
};

App.addInitializer(function(options) {
  var ev, r, region, _i, _len, _ref;
  console.log(options.event);
  this.ops = options;
  r = {};
  _ref = ['links', 'tickets', 'when_where'];
  for (_i = 0, _len = _ref.length; _i < _len; _i++) {
    region = _ref[_i];
    if (jQuery(options['evi_event_' + region + '_tag_id']).length > 0) {
      r[region] = options['evi_event_' + region + '_tag_id'];
    }
  }
  this.addRegions(r);
  ev = new Event(options.event);
  if (_.isEmpty(options.event.ID)) {
    this.hideRegForm();
    this.links.show(new NoEvent);
    return;
  }
  jQuery('.subheader').html(moment(ev.get('start').local).format('MMMM Do, YYYY')).prev().html(ev.get('venue').address.city + ", " + ev.get('venue').address.region);
  this.displayLinks(ev);
  this.displayTickets(ev);
  return this.displayWhenWhere(ev);
});
