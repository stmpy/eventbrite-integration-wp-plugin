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
      return moment().isBetween(moment(ticket.sales_start), moment(ticket.sales_end), 'minute') || moment(ticket.sales_end).isSame(moment(raceDayTicket.get('sales_end')), 'day');
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
    var a_day, difference, sale_ends, two_weeks;
    if (options == null) {
      options = {};
    }
    if (attributes.free) {
      this.set('price', 'Free');
    } else {
      this.set('price', attributes.cost.display);
    }
    sale_ends = moment(attributes.sales_end);
    two_weeks = moment().add(2, 'weeks');
    a_day = moment().add(24, 'hours');
    if (sale_ends.isBefore(two_weeks)) {
      this.set('timeleft', 'only ' + sale_ends.diff(moment(), 'days') + ' days left at this price');
    } else if (sale_ends.isBefore(a_day)) {
      difference = sale_ends.diff(moment(), 'hours');
      this.set('timeleft', 'only ' + difference + ' hour' + (difference === 1 ? '' : 's') + ' left at this price');
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
