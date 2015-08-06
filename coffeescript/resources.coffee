# ##     ##  #######  ########  ######## ##        ######
# ###   ### ##     ## ##     ## ##       ##       ##    ##
# #### #### ##     ## ##     ## ##       ##       ##
# ## ### ## ##     ## ##     ## ######   ##        ######
# ##     ## ##     ## ##     ## ##       ##             ##
# ##     ## ##     ## ##     ## ##       ##       ##    ##
# ##     ##  #######  ########  ######## ########  ######


Event = Backbone.Model.extend
	initialize: (attributes, options) ->
		# Set Metro
		expr = new RegExp(options.evi_event_metro_regex);
		match = @get('post_title').match(expr)
		metro = ( if match? and match[1]? then match[1] else @get('venue').address.city )
		@set 'metro', metro

		# Set Local URL, WP event page
		@set('local_url', '/' + options.evi_event_seo_url + '/' + @get('metro').toLowerCase().replace(/[^\w]+/g, '_') ) if options.evi_event_detail_page?

		# filter tickets and remove hidden ones first
		allTickets = _.filter @get('tickets'), (ticket) -> not ticket.hidden

		# rad pack
		radPack = _.max allTickets, (ticket) -> new Date(ticket.sales_end) - new Date(ticket.sales_start)

		# Set Race Day Ticket - don't include the rad pack in this search
		raceDayTicket = _.max _.filter(allTickets, (ticket) -> ticket.id isnt radPack.id), (ticket) -> new Date(ticket.sales_end)

		# Set Active Tickets
		tickets = new Tickets (_.filter allTickets, (ticket) ->
			moment().isBetween(moment(ticket.sales_start), moment(ticket.sales_end), 'minute') or
			moment(ticket.sales_end).isSame(moment(raceDayTicket.sales_end), 'day')
		), { raceDayTicket: raceDayTicket, radPack: radPack }

		@set 'tickets', tickets

		# Set Sold Out
		@set 'soldout', tickets.some (ticket) -> ticket.get('quantity_sold') >= ticket.get('quantity_total')

		# Set a formatted date
		start = attributes.start
		mStart = moment(start.local)
		mEnd = moment(attributes.end.local)
		start.formatted = mStart.format('dddd, MMMM Do, YYYY') + ' from ' + mStart.format('h:mm a') + ' to ' + mEnd.format('h:mm a zz')
		@set 'start', start

		# Set EventBrite URL
		@set 'url', @get('url').replace('http:','https:')

Ticket = Backbone.Model.extend
	initialize: (attributes, options = {}) ->
		if attributes.free
			@set 'price', 'Free'
		else
			@set 'price', ( if attributes.cost? then attributes.cost.display else 'TBD' )

		sale_ends = moment(attributes.sales_end)
		two_weeks = moment().add 2, 'weeks'
		a_day = moment().add 24, 'hours'
		an_hour = moment().add 60, 'minutes'

		if sale_ends.isBefore an_hour
			difference = sale_ends.diff(moment(), 'minutes')
			@set 'timeleft', 'only ' + difference + ' minute' + ( if difference is 1 then '' else 's' ) + ' left at this price'
		else if sale_ends.isBefore a_day
			difference = sale_ends.diff(moment(), 'hours')
			@set 'timeleft', 'only ' + difference + ' hour' + ( if difference is 1 then '' else 's' ) + ' left at this price'
		else if sale_ends.isBefore two_weeks
			@set 'timeleft', 'only ' + sale_ends.diff(moment(), 'days') + ' days left at this price'
		else
			@set 'timeleft', 'until ' + sale_ends.format 'MMMM Do YYYY'

		@set 'raceDayTicket', moment(options.raceDayTicket.sales_end).isSame(moment(attributes.sales_end), 'day') if options.raceDayTicket?

		# Sort - the end date is most important, the length is least important, only needs to be relative
		@set 'sort', parseInt(moment(attributes.sales_end).diff(moment(attributes.sales_start))) / 10000 + (parseInt(moment(attributes.sales_end).format("X")) * 10)


#  ######   #######  ##       ##       ########  ######  ######## ####  #######  ##    ##  ######
# ##    ## ##     ## ##       ##       ##       ##    ##    ##     ##  ##     ## ###   ## ##    ##
# ##       ##     ## ##       ##       ##       ##          ##     ##  ##     ## ####  ## ##
# ##       ##     ## ##       ##       ######   ##          ##     ##  ##     ## ## ## ##  ######
# ##       ##     ## ##       ##       ##       ##          ##     ##  ##     ## ##  ####       ##
# ##    ## ##     ## ##       ##       ##       ##    ##    ##     ##  ##     ## ##   ### ##    ##
#  ######   #######  ######## ######## ########  ######     ##    ####  #######  ##    ##  ######

Events = Backbone.Collection.extend { model: Event }
Tickets = Backbone.Collection.extend { model: Ticket, comparator: 'sort' }
