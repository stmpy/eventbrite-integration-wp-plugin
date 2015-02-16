var Event, Events, Ticket, Tickets;

Event = Backbone.Model.extend({
  initialize: function(attributes, options) {
    var allTickets, expr, mEnd, mStart, match, metro, start, tickets;
    if (options.evi_event_detail_page != null) {
      this.set('local_url', '/' + options.evi_event_detail_page + '/?' + options.evi_event_id_variable + '=' + this.get('ID'));
    }
    allTickets = this.get('tickets');
    tickets = new Tickets(_.filter(allTickets, function(ticket) {
      return moment().isBetween(moment(ticket.sales_start), moment(ticket.sales_end), 'minute');
    }));
    this.set('tickets', tickets);
    this.set('soldout', tickets.some(function(ticket) {
      return ticket.get('quantity_sold') >= ticket.get('quantity_total');
    }));
    this.set('raceDayTicket', new Ticket(_.max(allTickets, function(ticket) {
      return ticket.cost.value;
    })));
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
  },
  toJSON: function() {
    var attr;
    attr = _.clone(this.attributes);
    attr.raceDayTicket = this.get('raceDayTicket').toJSON();
    return attr;
  }
});

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
    if (sale_ends.isBefore(two_weeks)) {
      return this.set('timeleft', 'only ' + sale_ends.diff(moment(), 'days') + ' days left at this price');
    } else if (sale_ends.isBefore(a_day)) {
      difference = sale_ends.diff(moment(), 'hours');
      return this.set('timeleft', 'only ' + difference + ' hour' + (difference === 1 ? '' : 's') + ' left at this price');
    } else {
      return this.set('timeleft', 'until ' + sale_ends.format('MMMM Do YYYY'));
    }
  }
});

Events = Backbone.Collection.extend({
  model: Event
});

Tickets = Backbone.Collection.extend({
  model: Ticket
});
