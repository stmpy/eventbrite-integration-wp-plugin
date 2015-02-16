# ##     ##  #######  ########  ######## ##        ######
# ###   ### ##     ## ##     ## ##       ##       ##    ##
# #### #### ##     ## ##     ## ##       ##       ##
# ## ### ## ##     ## ##     ## ######   ##        ######
# ##     ## ##     ## ##     ## ##       ##             ##
# ##     ## ##     ## ##     ## ##       ##       ##    ##
# ##     ##  #######  ########  ######## ########  ######


Event = Backbone.Model.extend
	initialize: (attributes, options) ->
		# Set Local URL, WP event page
		@set('local_url', '/' + options.evi_event_detail_page + '/?' + options.evi_event_id_variable + '=' + @get 'ID') if options.evi_event_detail_page?

		allTickets = @get('tickets')
		# Set Active Tickets
		tickets = new Tickets _.filter allTickets, (ticket) ->
			moment().isBetween(moment(ticket.sales_start), moment(ticket.sales_end), 'minute')

		@set 'tickets', tickets

		# Set Sold Out
		@set 'soldout', tickets.some (ticket) -> ticket.get('quantity_sold') >= ticket.get('quantity_total')

		# Set Race Day Ticket
		@set 'raceDayTicket', new Ticket _.max allTickets, (ticket) ->
			ticket.cost.value

		# Set a formatted date
		start = attributes.start
		mStart = moment(start.local)
		mEnd = moment(attributes.end.local)
		start.formatted = mStart.format('dddd, MMMM Do, YYYY') + ' from ' + mStart.format('h:mm a') + ' to ' + mEnd.format('h:mm a zz')
		@set 'start', start

		# Set EventBrite URL
		@set 'url', @get('url').replace('http:','https:')

		# Set Metro
		expr = new RegExp(options.evi_event_metro_regex);
		match = @get('post_title').match(expr)
		metro = ( if match? and match[1]? then match[1] else @get('venue').address.city )
		@set 'metro', metro

	toJSON:  ->
		attr = _.clone @attributes
		attr.raceDayTicket = @get('raceDayTicket').toJSON()
		attr

Ticket = Backbone.Model.extend
	initialize: (attributes) ->
		if attributes.free
			@set 'price', 'Free'
		else
			@set 'price', attributes.cost.display

		sale_ends = moment(attributes.sales_end)
		two_weeks = moment().add 2, 'weeks'
		a_day = moment().add 24, 'hours'

		if sale_ends.isBefore two_weeks
			@set 'timeleft', 'only ' + sale_ends.diff(moment(), 'days') + ' days left at this price'
		else if sale_ends.isBefore a_day
			difference = sale_ends.diff(moment(), 'hours')
			@set 'timeleft', 'only ' + difference + ' hour' + ( if difference is 1 then '' else 's' ) + ' left at this price'
		else
			@set 'timeleft', 'until ' + sale_ends.format 'MMMM Do YYYY'

#  ######   #######  ##       ##       ########  ######  ######## ####  #######  ##    ##  ######
# ##    ## ##     ## ##       ##       ##       ##    ##    ##     ##  ##     ## ###   ## ##    ##
# ##       ##     ## ##       ##       ##       ##          ##     ##  ##     ## ####  ## ##
# ##       ##     ## ##       ##       ######   ##          ##     ##  ##     ## ## ## ##  ######
# ##       ##     ## ##       ##       ##       ##          ##     ##  ##     ## ##  ####       ##
# ##    ## ##     ## ##       ##       ##       ##    ##    ##     ##  ##     ## ##   ### ##    ##
#  ######   #######  ######## ######## ########  ######     ##    ####  #######  ##    ##  ######

Events = Backbone.Collection.extend { model: Event }
Tickets = Backbone.Collection.extend { model: Ticket }
