var Event, Events, Ticket, Tickets;

Event = Backbone.Model.extend({
  initialize: function(attributes, options) {
    var allTickets, expr, mEnd, mStart, match, metro, raceDayTicket, radPack, start, tickets;
    expr = new RegExp(options.evi_event_metro_regex);
    match = this.get('post_title').match(expr);
    metro = ((match != null) && (match[1] != null) ? match[1] : this.get('venue').address.city);
    this.set('metro', metro);
    if (options.evi_event_detail_page != null) {
      this.set('local_url', '/' + options.evi_event_seo_url + '/' + this.get('metro').toLowerCase().replace(/[^\w]+/g, '_'));
    }
    allTickets = _.filter(this.get('tickets'), function(ticket) {
      return !ticket.hidden;
    });
    radPack = _.max(allTickets, function(ticket) {
      return new Date(ticket.sales_end) - new Date(ticket.sales_start);
    });
    raceDayTicket = _.max(_.filter(allTickets, function(ticket) {
      return ticket.id !== radPack.id;
    }), function(ticket) {
      return new Date(ticket.sales_end);
    });
    tickets = new Tickets(_.filter(allTickets, function(ticket) {
      return moment().isBetween(moment(ticket.sales_start), moment(ticket.sales_end), 'minute') || moment(ticket.sales_end).isSame(moment(raceDayTicket.sales_end), 'day');
    }), {
      raceDayTicket: raceDayTicket,
      radPack: radPack
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
    return this.set('url', this.get('url').replace('http:', 'https:'));
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
      this.set('raceDayTicket', moment(options.raceDayTicket.sales_end).isSame(moment(attributes.sales_end), 'day'));
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
