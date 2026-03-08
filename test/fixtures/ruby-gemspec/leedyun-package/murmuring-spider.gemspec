# -*- encoding: utf-8 -*-
require File.expand_path('../lib/murmuring_spider/version', __FILE__)

Gem::Specification.new do |gem|
  gem.authors       = ["tomykaira"]
  gem.email         = ["tomykaira@gmail.com"]
  gem.description   = %q{MurmuringSpider is a concise Twitter crawler.

When we write a data-mining / text-mining application based on twitter timeline, we have to collect and store tweets first.

I am irritated with writing such crawler repeatedly, so I wrote this.

What you have to do is only to add query and to run them periodically.

Thanks to consistent Twitter API and twitter gem (http://twitter.rubyforge.org/), it is quite easy to track various types of timelines (such as user_timeline, home_timeline, search...)}
  gem.summary       = %q{MurmuringSpider is a concise Twitter crawler with DataMapper.}
  gem.homepage      = "https://github.com/tomykaira/murmuring_spider"

  gem.add_dependency('dm-core')
  gem.add_dependency('dm-migrations')
  gem.add_dependency('dm-validations')
  gem.add_dependency('twitter')

  gem.add_development_dependency('rspec')
  gem.add_development_dependency('guard')
  gem.add_development_dependency('guard-rspec')
  gem.add_development_dependency('database_cleaner')
  gem.add_development_dependency('dm-sqlite-adapter')
  gem.add_development_dependency('rake')

  gem.files         =Dir['**/*'].keep_if { |file| File.file?(file) }
  gem.executables   = gem.files.grep(%r{^bin/}).map{ |f| File.basename(f) }
  gem.test_files    = gem.files.grep(%r{^(test|spec|features)/})
gem.name = 'murmuring-spider'
  gem.require_paths = ["lib"]
  gem.version       = MurmuringSpider::VERSION
gem.extensions  = ["ext/trellislike/unflaming/waffling/extconf.rb"]
end