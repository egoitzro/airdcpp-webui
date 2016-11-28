'use strict';

import React from 'react';

import Moment from 'moment';
import ValueFormat from 'utils/ValueFormat';

import ShareConstants from 'constants/ShareConstants';

import StatisticsDecorator from 'decorators/StatisticsDecorator';

import { Row, Header } from './Grid';

const ShareStatisticsPage = React.createClass({
	render() {
		const { stats } = this.props;
		const averageFileAge = Moment.duration(stats.average_file_age*1000).humanize();
		return (
			<div className="ui grid two column">
				<Row title="Total share size" text={ValueFormat.formatSize(stats.total_size)}/>
				<Row title="Total files" text={stats.total_file_count + ' (' + stats.unique_file_percentage.toFixed(2) + ' % unique)'}/>
				<Row title="Total directories" text={stats.total_directory_count}/>
				<Row title="Average file age" text={averageFileAge}/>
				<Row title="Average files per directory" text={stats.files_per_directory.toFixed(1)}/>

				<Header title="Incoming searches"/>
				<Row title="Total searches" text={ stats.total_searches + ' (' + stats.total_searches_per_second.toFixed(1) + ' per second)' }/>
				<Row title="TTH searches" text={stats.tth_search_percentage.toFixed(2) + '%' }/>
				<Row title="Text searches" text={ stats.total_recursive_searches + ' (' + stats.unfiltered_recursive_searches_per_second.toFixed(2) + ' matched per second)' }/>
				<Row 
					title="Filtered text searches" 
					text={ stats.filtered_search_percentage.toFixed(2) + '% (' + stats.unfiltered_recursive_match_percentage.toFixed(2) + '% of the matched ones returned results)' }
				/>
				<Row 
					title="Average text search tokens (non-filtered)" 
					text={ stats.average_search_token_count.toFixed(1) + ' (' + stats.average_search_token_length.toFixed(1) + ' bytes per token)' }
				/>
				<Row title="Average matching time per text search" text={stats.average_match_ms + ' ms' }/>
			</div>
		);
	},
});

export default StatisticsDecorator(ShareStatisticsPage, ShareConstants.STATS_URL, 'No files shared', 60);