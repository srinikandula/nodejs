#!/usr/bin/env ruby

require 'open-uri'
require 'CSV'

def usage
  puts "Usage: #{__FILE__} <csv_file> <rest_api_base_url>\n"
  exit 0
end

csv_file = ARGV[0]
base_url = ARGV[1]

usage if csv_file.to_s.empty? || base_url.to_s.empty?

unless File.exists? csv_file
  puts "ERROR.  Could not find file '#{csv_file}\n"
  exit 1
end

puts "importing data...\n\n"

#
# The csv file is of the following format:
# neighborhood,borough
# for example:
# Sutton Place,Manhattan
#


all_neighborhoods = []
# all_boroughs = []

CSV.foreach(csv_file) do |row|
  val = row[1].to_s.empty? ? row[0] : "#{row[1]}: #{row[0]}"
  all_neighborhoods << val
  # all_neighborhoods << "#{row[1]}: #{row[0]}"
  # all_boroughs << row[1]
end

puts "\n\nall_neighborhoods:\n#{all_neighborhoods.inspect}\n\n"

all_neighborhoods.uniq!
all_neighborhoods.sort!
# all_boroughs.uniq!.sort!

# puts "all_boroughs is #{all_boroughs.inspect}\n\n"
puts "all_neighborhoods is #{all_neighborhoods.inspect}\n\n"

city = 'New York'
state = 'NY'

url = "#{base_url}/api/v1/neighborhoods"

# (all_neighborhoods + all_boroughs).each do |neighborhood|
all_neighborhoods.each do |neighborhood|
  cmd = %Q|curl --user beacon:beacon123 -X POST -d "neighborhood=#{URI::encode(neighborhood)}" -d "city=#{URI::encode(city)}" -d "state=#{URI::encode(state)}" "#{url}"|
  puts "#{cmd}"
  `#{cmd}`
end